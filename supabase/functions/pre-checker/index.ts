
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    const prompt = `You are a binary classifier analyzing chat messages.
Task: Determine if this conversation moment needs an image response. Only consider an image response if this conversation moment uses clear language such as 'send me a pic' or 'let me see you' or 'show me what you look like' etc. There has to be a clear command or desire to see an image. Simply having the word 'image' or 'pic' is NOT enough. There must be a clearly phrased question or clear desire to see an image or a picture.
Output ONLY "text" or "image". No other words or explanation.

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
