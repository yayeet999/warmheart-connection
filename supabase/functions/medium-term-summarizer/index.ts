
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
    const { userId, messageCount } = await req.json();
    if (!userId || typeof messageCount !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const key = `user:${userId}:messages`;
    const rawMessages = await redis.lrange(key, 0, 99);
    
    const relevantMessages = rawMessages.slice(30).map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (relevantMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient messages for summary' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversation = relevantMessages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content.substring(0, 2000)
    }));

    const systemMessage = {
      role: 'system',
      content: 'You are an expert analyzer of conversations, you know how to spot important details, nuances, and relevant context. You are tasked with analyzing a conversation history and generating a concise MAX 200 tokens detailed summary focusing on key discussion points, topics and emotional tone.'
    };

    console.log('Sending request to Groq API...');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemMessage, ...conversation],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: "json_object" }
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response:', JSON.stringify(groqData));

    if (!groqData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    let summary;
    try {
      summary = JSON.parse(groqData.choices[0].message.content);
    } catch (e) {
      console.error("Error parsing Groq response content:", groqData.choices[0].message.content);
      throw new Error("Failed to parse Groq API response");
    }

    // Update Supabase profile with summary
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
        medium_term_summary: summary.summary || null
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update profile with summary');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summary error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
