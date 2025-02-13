
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
  
  try {
    const { userId, message } = await req.json();
    
    if (!userId || !message) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing message for user:', userId);

    // Get last 2 messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 1);
    console.log('Retrieved recent messages:', recentMessages.length);

    // Format the context from recent messages
    const formattedContext = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return parsed.content;
        } catch (e) {
          console.error('Error parsing message:', e);
          return '';
        }
      })
      .reverse();

    while (formattedContext.length < 2) {
      formattedContext.push(''); // Pad with empty strings if we don't have enough context
    }

    // Construct the prompt for Llama
    const prompt = `You are a binary classifier analyzing chat messages.
Task: Determine if this conversation moment needs an image response.
Output ONLY "text" or "image". No other words or explanation.

Previous message 2: ${formattedContext[0]}
Previous message 1: ${formattedContext[1]}
Current message: ${message}

Classify:`;

    console.log('Calling Llama model with prompt');

    // Call Llama model via Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama2-3.1-8b-instant",
        messages: [
          { role: 'system', content: 'You are a binary classifier that only outputs "text" or "image".' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Low temperature for more consistent outputs
        max_tokens: 1, // We only need one word
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get model response');
    }

    const data = await response.json();
    console.log('Received response from model:', data);

    // Extract and validate the output type
    let outputType = data.choices[0].message.content.trim().toLowerCase();
    
    // Ensure we only get 'text' or 'image' as output
    outputType = outputType === 'image' ? 'image' : 'text';

    const processingTime = Math.round(performance.now() - startTime);

    // Log the pre-checker result
    const { error: logError } = await supabase
      .from('pre_checker_logs')
      .insert({
        user_id: userId,
        input_message: message,
        output_type: outputType,
        processing_time_ms: processingTime
      });

    if (logError) {
      console.error('Error logging pre-checker result:', logError);
    }

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

    // If we have userId and message, log the error
    try {
      const { userId, message } = await req.json();
      if (userId && message) {
        await supabase
          .from('pre_checker_logs')
          .insert({
            user_id: userId,
            input_message: message,
            output_type: 'text', // Default to text on error
            processing_time_ms: processingTime,
            error: error.message
          });
      }
    } catch (e) {
      console.error('Error logging failure:', e);
    }

    return new Response(
      JSON.stringify({ 
        messageType: 'text', // Default to text on error
        error: error.message,
        processingTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
