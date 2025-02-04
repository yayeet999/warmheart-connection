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

const SYSTEM_PROMPT = `// ... keep existing code`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log('Analyzing emotions for user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get recent messages from Redis
    const chatKey = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(chatKey, 0, 19); // Get last 20 messages
    console.log('Fetched recent messages:', recentMessages?.length || 0);

    if (!recentMessages || recentMessages.length === 0) {
      console.log('No messages found for analysis');
      return new Response(
        JSON.stringify({ 
          analysis: JSON.stringify({
            primary_emotion: "neutral",
            primary_sub_emotion: "calm",
            primary_intensity: 1,
            secondary_emotion: "neutral",
            secondary_sub_emotion: "balanced",
            secondary_intensity: 1,
            context_description: "Not enough messages for analysis"
          })
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Parse messages and extract user messages only
    const userMessages = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return parsed?.type === 'user' ? parsed.content : null;
        } catch (e) {
          console.error('Error parsing message:', e);
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // Put in chronological order

    console.log('Extracted user messages:', userMessages.length);

    if (userMessages.length === 0) {
      console.log('No valid user messages found for analysis');
      return new Response(
        JSON.stringify({ 
          analysis: JSON.stringify({
            primary_emotion: "neutral",
            primary_sub_emotion: "calm",
            primary_intensity: 1,
            secondary_emotion: "neutral",
            secondary_sub_emotion: "balanced",
            secondary_intensity: 1,
            context_description: "No valid messages for analysis"
          })
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Prepare the immediate and rolling context
    const immediateContext = userMessages.slice(-3).map((msg, i) => 
      `${i + 1}) '${msg}'`
    ).join('\n');

    const rollingContext = userMessages.map((msg, i) => 
      `${i + 1}) user: ${msg}`
    ).join('\n');

    // Call OpenAI for emotional analysis
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: 'system', 
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `IMMEDIATE (last 3 user messages):\n${immediateContext}\n\nROLLING CONTEXT (last 20 messages):\n${rollingContext}`
          }
        ],
      }),
    });

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const emotionalAnalysis = data.choices[0].message.content;
    console.log('Emotional analysis:', emotionalAnalysis);

    // Store emotional analysis in Redis
    const emotionKey = `user:${userId}:emotional_state`;
    await redis.set(emotionKey, emotionalAnalysis);
    // Set expiry to 5 minutes since emotional states are temporary
    await redis.expire(emotionKey, 300);

    return new Response(
      JSON.stringify({ analysis: emotionalAnalysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in emotion-analyzer:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        analysis: JSON.stringify({
          primary_emotion: "neutral",
          primary_sub_emotion: "calm",
          primary_intensity: 1,
          secondary_emotion: "neutral",
          secondary_sub_emotion: "balanced",
          secondary_intensity: 1,
          context_description: "Error during analysis"
        })
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});