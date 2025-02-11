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

    // Build a Redis key based on user + current date
    const key = `user:${userId}:daily:${new Date().toISOString().split('T')[0]}`;

    // 1) Fetch current daily message count
    const getCountResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    const countData = await getCountResponse.json();
    const currentCount = countData.result ? parseInt(countData.result) : 0;

    // 2) Compare vs. daily limit
    const dailyLimit = DAILY_LIMITS[tier as keyof typeof DAILY_LIMITS] || DAILY_LIMITS.free;
    const canSendMessage = currentCount < dailyLimit;

    if (canSendMessage) {
      // 3) If still under the limit, increment the count
      await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${key}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
      });

      // 4) Ensure the key expires at end-of-day (if not already)
      const now = new Date();
      const ttl = 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
      await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${key}/${ttl}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
      });
    }

    // 5) Return result
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
