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

const COMPANION_SYSTEM_PROMPT = `// ... keep existing code`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    
    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    // Fetch emotional analysis from Redis
    const emotionKey = `user:${userId}:emotional_state`;
    const emotionalAnalysis = await redis.get(emotionKey);
    console.log('Fetched emotional analysis:', emotionalAnalysis);

    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 29);
    console.log('Fetched recent messages from Redis:', recentMessages?.length || 0);

    // Parse and format messages for OpenAI
    const conversationHistory = (recentMessages || [])
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          
          if (!parsed?.type || !parsed?.content) {
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
        emotionalContext = "Error processing emotional analysis.";
      }
    }

    // Get OpenAI API key from environment variables
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
            content: `${COMPANION_SYSTEM_PROMPT}\n\nEMOTIONAL ANALYSIS:\n${emotionalContext}`
          },
          ...(conversationHistory || []),
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    return new Response(
      JSON.stringify({ reply: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        reply: "I apologize, but I'm having trouble responding right now. Please try again." 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});