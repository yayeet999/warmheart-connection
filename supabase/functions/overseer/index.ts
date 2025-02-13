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
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;
    console.log('Overseer analyzing messages for user:', userId);

    // Get the most recent 5 messages
    const messages = await redis.lrange(key, 0, 4); 
    console.log('Retrieved last 5 messages from Redis:', messages.length);

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('No messages found for analysis');
      return new Response(
        JSON.stringify({ success: false, error: 'No messages to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse each Redis item
    const conversation = messages.map((msg) => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch (e) {
        console.error('Error parsing message:', e);
        return null;
      }
    }).filter(Boolean);

    // Format for the Groq classification
    const formattedConversation = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Overly strict system prompt to only detect serious SUICIDE or VIOLENCE
    const systemMessage = {
      role: 'system',
      content: `You are a content moderator focusing ONLY on urgent, explicit signals of self-harm or violent threats. Return EXACTLY one of: "SUICIDE", "VIOLENCE", or "" (empty string). 
Criteria:
1) "SUICIDE" if there's a clear direct statement of suicidal intent/plans (not jokes or iffy language).
2) "VIOLENCE" if there's a specific, immediate threat of harm to others (not joking or vague).
3) Otherwise, return empty string.`
    };

    // Send to Groq for classification
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemMessage, ...formattedConversation],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq classification error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const classification = (groqData.choices?.[0]?.message?.content || '').trim();
    console.log('Overseer classification result:', classification);

    // Next we check the existing extreme_content in profiles, so we don't increment repeatedly
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Fetch user profile to see if the same classification is already set
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=extreme_content`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    });
    if (!profileRes.ok) {
      throw new Error(`Could not fetch user profile. Status: ${profileRes.status}`);
    }
    const [profile] = await profileRes.json();
    const currentFlag = profile?.extreme_content || null;
    console.log('Current extreme_content in DB:', currentFlag);

    // 2) Decide how to update
    //    - If classification is "", remove any existing flag
    //    - If classification is "SUICIDE" or "VIOLENCE" but matches the existing flag, do nothing
    //    - If classification is "SUICIDE" or "VIOLENCE" AND is different from existing, increment concerns
    let result: any = null;

    if (classification === "") {
      console.log('No new issues -> clearing extreme_content if any');
      // Clear the extreme_content in DB
      const clearRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          extreme_content: null
        })
      });
      if (!clearRes.ok) {
        console.error('Error clearing extreme_content:', await clearRes.text());
      }

      // Return null to chat
      result = null;
    } else if (classification === currentFlag) {
      console.log(`Classification matches existing flag (${currentFlag}), skipping increment.`);
      // Return nothing new
      result = null;
    } else {
      // We have a newly detected SUICIDE or VIOLENCE different from the old flag
      console.log('New serious content detected -> increment_safety_concern');
      const increment = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_safety_concern`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id_param: userId,
          concern_type: classification
        })
      });
      if (!increment.ok) {
        const incErr = await increment.text();
        throw new Error(`Failed to increment safety concern: ${incErr}`);
      }
      const incData = await increment.json();
      console.log('increment_safety_concern returned:', incData);

      // incData = { accountDisabled, warningCount, concernType }
      result = incData;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Overseer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
