
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
    console.log('Processing medium-term summary for user:', userId, 'at message count:', messageCount);

    // Fetch messages from Redis (last 30-99 messages)
    const key = `user:${userId}:messages`;
    const messages = await redis.lrange(key, 0, 99);
    
    // Filter to get messages 30-99 (if available)
    const relevantMessages = messages.slice(30).map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch (e) {
        console.error('Error parsing message:', e);
        return null;
      }
    }).filter(Boolean);

    if (relevantMessages.length === 0) {
      console.log('No relevant messages found for summarization');
      return new Response(
        JSON.stringify({ success: false, error: 'No messages to summarize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare conversation for summarization
    const conversation = relevantMessages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Generate summary using Groq
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
            content: 'Create a concise summary of the key points and themes from this conversation. Focus on the main topics discussed and any important conclusions reached.'
          },
          ...conversation
        ],
        temperature: 0.5,
        stop: null
      }),
    });

    if (!groqResponse.ok) {
      throw new Error('Failed to generate summary: ' + await groqResponse.text());
    }

    const aiResult = await groqResponse.json();
    const summary = aiResult.choices[0].message.content;

    // Update Supabase with the new summary
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const summaryObject = {
      summary,
      message_range: {
        start: 30,
        end: 99
      },
      created_at: new Date().toISOString(),
      message_count: messageCount
    };

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        medium_term_summaries: JSON.stringify([summaryObject])
      })
    });

    if (!supabaseResponse.ok) {
      throw new Error('Failed to update profile with summary');
    }

    console.log('Successfully generated and stored summary for user:', userId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in medium-term-summarizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
