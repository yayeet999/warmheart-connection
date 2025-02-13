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
      .filter(Boolean) // Remove empty strings
      .reverse();

    // Pad with empty strings if needed
    while (formattedContext.length < 2) {
      formattedContext.push('');
    }

    const systemMessage = {
      role: 'system',
      content: 'You are a binary classifier that ONLY outputs "text" or "image". Never output anything else.'
    };

    const userMessages = [
      ...formattedContext.map(msg => ({
        role: 'user' as const,
        content: msg
      })),
      {
        role: 'user' as const,
        content: typeof message === 'string' ? message : message.content || ''
      }
    ];

    console.log('Calling Groq API...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemMessage, ...userMessages],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      console.error('Groq API error status:', response.status);
      const errorText = await response.text();
      console.error('Groq API error text:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // More robust error handling for Groq response
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid Groq response format:', data);
      console.log('Defaulting to text response');
      data.choices = [{ message: { content: 'text' } }];
    }

    console.log('Raw model response:', data.choices[0].message.content);

    // Strictly validate the output
    let outputType = data.choices[0].message.content.trim().toLowerCase();
    if (!['text', 'image'].includes(outputType)) {
      console.log('Invalid model output, defaulting to text:', outputType);
      outputType = 'text';
    }

    const processingTime = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({ 
        success: true,
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
        success: false,
        messageType: 'text',
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
