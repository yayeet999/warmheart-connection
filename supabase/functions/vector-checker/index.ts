
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();
    
    if (!userId || typeof message !== 'string') {
      throw new Error('Invalid request parameters');
    }

    console.log('Running vector check for userId:', userId);

    // Check message count first
    const key = `user:${userId}:messages`;
    const totalCount = await redis.llen(key);

    if (totalCount < 47) {
      console.log('Message count below threshold:', totalCount);
      return new Response(
        JSON.stringify({ 
          shouldVectorSearch: false,
          reason: `Message count (${totalCount}) below threshold`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch last 3 messages for context
    const recentMessages = await redis.lrange(key, 0, 2);
    const recentContext = recentMessages
      .map(msg => {
        try {
          const parsed = JSON.parse(msg);
          return parsed.content;
        } catch (e) {
          console.error('Error parsing message:', e);
          return '';
        }
      })
      .filter(Boolean)
      .reverse()
      .join('\n');

    console.log('Analyzing with context from last 3 messages');

    // Call Groq API to analyze if vector search is needed
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are an AI analyzing conversations to determine if accessing long-term memory (vector search) would be valuable. 
            
Analyze the current message and recent context to determine if there might be relevant past conversations or experiences that would enhance the interaction.

Consider these factors:
1. Is the user referencing past conversations or shared experiences?
2. Are they asking about preferences, opinions, or things discussed before?
3. Is there emotional continuity or development from past interactions?
4. Would past context help in providing a more meaningful response?

Respond with ONLY "true" if vector search would be valuable, or "false" if not needed.`
          },
          {
            role: 'user',
            content: `Current message: "${message}"

Recent context:
${recentContext}

Should we search long-term memory for relevant past interactions? Reply with just true or false.`
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const decision = groqData.choices[0].message.content.toLowerCase().includes('true');

    console.log('Vector search decision:', decision);

    return new Response(
      JSON.stringify({ 
        shouldVectorSearch: decision,
        reason: decision ? 'Analysis suggests relevant past context' : 'No relevant past context needed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vector-checker function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

