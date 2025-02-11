
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

const EXAMPLES = {
  hateSpeech: [
    "Explicit threats of violence against specific groups",
    "Severe discriminatory language targeting protected characteristics",
    "Repeated hostile dehumanizing statements"
  ],
  selfHarm: [
    "Explicit plans for suicide",
    "Detailed discussions of self-harm methods",
    "Immediate threats to one's own life"
  ],
  violence: [
    "Detailed plans to harm others",
    "Graphic descriptions of violence",
    "Encouraging or glorifying extreme violence"
  ]
};

const SUICIDE_HOTLINE = "National Suicide Prevention Lifeline: 988 - Available 24/7";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;
    console.log('Analyzing messages for user:', userId);

    // Get the last 10 messages
    const messages = await redis.lrange(key, 0, 9);
    const conversation = messages.map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (conversation.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No messages to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the conversation for analysis
    const formattedConversation = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'amorine',
      content: msg.content
    }));

    // Call Groq API for analysis
    const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
        'X-Groq-Safety-Check': 'disabled'
      },
      body: JSON.stringify({
        model: 'llama-3.2-1b-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert text message conversation analyzer focused on two tasks:

1. Detecting extreme content including:
- Hate speech (examples: ${EXAMPLES.hateSpeech.join(', ')})
- Self-harm/suicide risk (examples: ${EXAMPLES.selfHarm.join(', ')})
- Extreme violence (examples: ${EXAMPLES.violence.join(', ')})

2. Evaluating AI assistant (Amorine) performance for:
- Very poor quality and engagement
- Clearly disregarding user needs/emotions
- Continous minimal short messages lasting only a few words
- Excessive repetitive unwanted behavior detection
- Not correctly adjusting messaging style appropriately to current context
- Excessive question asking

Analyze the conversation and return a JSON object with two fields:
- extremeContent: null OR a string describing specific concerns + resources (include ${SUICIDE_HOTLINE} if relevant)
- guidance: null OR specific recommendations for improving Amorine's performance

Only include fields if issues are detected. When evaluating Amorine performance, only provide guidance if absolutey needed, use your advanced NLP capabilities and judgement. Be specific and actionable in recommendations.`
          },
          ...formattedConversation
        ],
        temperature: 0.2,
        max_tokens: 200
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const { choices: [{ message }] } = await groqResponse.json();
    const analysis = JSON.parse(message.content);

    // Update Supabase profile with analysis results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        extreme_content: analysis.extremeContent,
        guidance: analysis.guidance
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update profile with analysis');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Overseer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
