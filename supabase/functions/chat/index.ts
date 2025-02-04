import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANION_SYSTEM_PROMPT = `You are a feminine, caring companion participating in an ongoing conversation. Each interaction includes the recent history and emotional analysis for context.

EMOTIONAL CONTEXT:
You will receive:
- Recent emotional analysis of the user
- Primary and secondary emotions with intensities
- Context description of their emotional state
Use this to:
- Acknowledge and validate their emotions
- Adjust your tone and support style
- Show understanding of their emotional journey
- Provide appropriate emotional support

CONVERSATION GUIDELINES:
- Use emoticons naturally (35% of messages)
- Keep each message 2-5 sentences
- Always validate before exploring deeper
- Focus on emotional support and gentle guidance
- Never schedule meetups or mention being AI
- Redirect explicit content to respectful conversation

CONVERSATION HISTORY:
You will receive:
- The last 30 messages for context
- Current emotional analysis
Use this to:
- Maintain context and continuity
- Reference specific details
- Track emotional progress
- Build upon previous discussions
- Ensure responses align with emotional state`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get OpenAI API key from environment variables
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not found in environment variables');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, userId } = await req.json();
    
    // Fetch emotional analysis from Redis
    const emotionKey = `user:${userId}:emotional_state`;
    const emotionalAnalysis = await redis.get(emotionKey);
    console.log('Fetched emotional analysis:', emotionalAnalysis);

    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 29);
    console.log('Fetched recent messages from Redis:', recentMessages.length);

    // Parse and format messages for OpenAI
    const conversationHistory = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          
          if (!parsed || !parsed.type || !parsed.content) {
            console.error('Invalid message format:', msg);
            return null;
          }

          return {
            role: parsed.type === "ai" ? "assistant" : "user",
            content: parsed.content
          };
        } catch (e) {
          console.error('Error parsing message:', e, 'Raw message:', msg);
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    // Create emotional context message
    let emotionalContext = "No emotional analysis available.";
    if (emotionalAnalysis) {
      try {
        // Clean up the markdown formatting if present
        let cleanedAnalysis = emotionalAnalysis;
        if (typeof emotionalAnalysis === 'string') {
          // Remove markdown code block formatting if present
          cleanedAnalysis = emotionalAnalysis.replace(/```json\n|\n```/g, '');
        }
        
        // Parse the cleaned JSON
        const analysis = typeof cleanedAnalysis === 'string' 
          ? JSON.parse(cleanedAnalysis) 
          : cleanedAnalysis;
          
        emotionalContext = `Current Emotional State:
- Primary: ${analysis.primary_emotion} (${analysis.primary_sub_emotion}) - Intensity: ${analysis.primary_intensity}
- Secondary: ${analysis.secondary_emotion} (${analysis.secondary_sub_emotion}) - Intensity: ${analysis.secondary_intensity}
Context: ${analysis.context_description}`;
      } catch (e) {
        console.error('Error handling emotional analysis:', e, 'Raw analysis:', emotionalAnalysis);
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",  
        messages: [
          { 
            role: 'system', 
            content: `${COMPANION_SYSTEM_PROMPT}\n\nEMOTIONAL ANALYSIS:\n${emotionalContext}`
          },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return new Response(
      JSON.stringify({ reply: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
