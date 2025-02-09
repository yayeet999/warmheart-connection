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

    // Updated message processing
    const conversation = relevantMessages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'amorine', // Changed to 'amorine'
      content: msg.content.substring(0, 2000) // Truncate to 2k characters
    }));

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
            content: 'You are an expert analyzer of conversations, you know how to spot important details, nuances, and relevant context. You are tasked with analyzing a conversation history and generating a concise MAX 200 tokens detailed summary focusing on key discussion points, topics and emotional tone.'
          },
          ...conversation
        ],
        temperature: 0.5,
        max_tokens: 200 // Strict token limit
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const { choices: [{ message }] } = await groqResponse.json();
    const summary = message.content;

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
        medium_term_summaries: JSON.stringify([{
          summary,
          message_range: { start: 30, end: 99 },
          created_at: new Date().toISOString(),
          message_count: messageCount
        }])
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Supabase update failed');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summary error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
