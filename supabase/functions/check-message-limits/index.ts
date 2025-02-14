
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIMITS = {
  free: {
    total: 200,  // 200 total messages for free tier
  },
  pro: {
    total: Infinity  // No limit for pro tier
  }
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

    // Build Redis key for total messages
    const totalKey = `user:${userId}:total`;

    // 1) Fetch current total message count
    const getTotalResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${totalKey}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    const totalData = await getTotalResponse.json();
    const currentTotal = totalData.result ? parseInt(totalData.result) : 0;

    // 2) Compare vs. total limit
    const totalLimit = LIMITS[tier as keyof typeof LIMITS].total;
    const canSendMessage = tier === 'pro' || currentTotal < totalLimit;

    if (canSendMessage) {
      // 3) If allowed to send, increment the total count (for both free and pro users)
      await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${totalKey}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        },
      });
    }

    // 4) Return result
    return new Response(
      JSON.stringify({
        canSendMessage,
        currentTotal,
        totalLimit: tier === 'pro' ? null : totalLimit,
        remainingMessages: tier === 'pro' ? null : totalLimit - currentTotal
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
