
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  let userId: string | undefined;
  let message: string | undefined;
  
  try {
    // Safely parse the request body
    try {
      const body = await req.json();
      userId = body.userId;
      message = body.message;
      
      if (!userId || !message) {
        throw new Error('Missing required parameters');
      }
    } catch (e) {
      throw new Error(`Invalid request body: ${e.message}`);
    }

    console.log('Processing message for user:', userId);

    // Get last 2 messages from Redis with error handling
    const key = `user:${userId}:messages`;
    let recentMessages: any[] = [];
    try {
      recentMessages = await redis.lrange(key, 0, 1);
      console.log('Retrieved recent messages count:', recentMessages.length);
    } catch (e) {
      console.error('Error retrieving messages from Redis:', e);
      // Continue with empty context rather than failing
    }

    // Safely format the context from recent messages
    const formattedContext = recentMessages
      .map(msg => {
        if (!msg) return '';
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return parsed?.content || '';
        } catch (e) {
          console.error('Error parsing message:', e);
          return '';
        }
      })
      .filter(Boolean)
      .reverse();

    // Pad with empty strings if needed
    while (formattedContext.length < 2) {
      formattedContext.push('');
    }

    const prompt = `You are a binary classifier analyzing chat messages.
Task: Determine if this conversation moment needs an image response.
Output ONLY "text" or "image". No other words or explanation.

Previous message 2: ${formattedContext[0]}
Previous message 1: ${formattedContext[1]}
Current message: ${message}

Classify:`;

    console.log('Calling Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'You are a binary classifier that ONLY outputs "text" or "image". Never output anything else.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2
      })
    });

    if (!response.ok) {
      console.error('Groq API error status:', response.status);
      const errorText = await response.text();
      console.error('Groq API error text:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw model response:', data.choices[0].message.content);

    // Strictly validate the output
    let outputType = data.choices[0].message.content.trim().toLowerCase();
    if (!['text', 'image'].includes(outputType)) {
      console.log('Invalid model output, defaulting to text:', outputType);
      outputType = 'text';
    }

    const processingTime = Math.round(performance.now() - startTime);

    // Log the final decision
    console.log(`Pre-checker decision: ${outputType}`);

    return new Response(
      JSON.stringify({ 
        messageType: outputType,
        processingTime 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in pre-checker function:', error);
    
    const processingTime = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({ 
        messageType: 'text', // Default to text on error
        error: error.message,
        processingTime
      }),
      { 
        status: error.message.includes('Invalid request') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
