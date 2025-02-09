
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMITS = {
  free: 50,  // 50 messages per day for free tier
  pro: 500   // 500 messages per day for pro tier
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, tier } = await req.json();
    
    // Get Redis URL and token from environment
    const UPSTASH_REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const UPSTASH_REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis configuration missing');
    }

    // Get current count from Redis
    const key = `user:${userId}:daily:${new Date().toISOString().split('T')[0]}`;
    
    const getCountResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    });
    
    const countData = await getCountResponse.json();
    const currentCount = countData.result ? parseInt(countData.result) : 0;
    
    // Check if user has exceeded daily limit
    const dailyLimit = DAILY_LIMITS[tier as keyof typeof DAILY_LIMITS] || DAILY_LIMITS.free;
    const canSendMessage = currentCount < dailyLimit;
    
    if (canSendMessage) {
      // Increment the count if under limit
      await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${key}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
      });
      
      // Set expiry to end of day if not already set
      const ttl = 86400 - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds());
      await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${key}/${ttl}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
      });

      // Check if we need to trigger medium-term summarization
      // Trigger at 60 messages and then every 30 messages after that
      const shouldTriggerSummary = currentCount + 1 === 60 || (currentCount + 1 > 60 && ((currentCount + 1 - 60) % 30 === 0));
      
      if (shouldTriggerSummary) {
        console.log('Triggering medium-term summarization for user:', userId, 'at count:', currentCount + 1);
        
        try {
          const summarizerResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/medium-term-summarizer`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              messageCount: currentCount + 1
            })
          });

          if (!summarizerResponse.ok) {
            console.error('Failed to trigger summarizer:', await summarizerResponse.text());
          }
        } catch (error) {
          console.error('Error triggering summarizer:', error);
          // Don't throw the error as this is a background task
        }
      }
    }

    return new Response(
      JSON.stringify({
        canSendMessage,
        currentCount,
        dailyLimit,
        remainingMessages: dailyLimit - currentCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
