
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, action } = await req.json();
    console.log('Request received:', { userId, action });

    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:chunk_count`;
    console.log('Redis key:', key);

    switch (action) {
      case 'increment': {
        const count = await redis.incr(key);
        console.log('Incremented count:', count);

        // If we hit 55 messages, increment the super summary counter
        if (count >= 55) {
          try {
            const response = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/super_summary_counter`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                },
                body: JSON.stringify({
                  userId,
                  action: 'increment'
                })
              }
            );
            const superSummaryData = await response.json();
            console.log('Super summary counter response:', superSummaryData);

            // Reset chunk counter after successful summary
            await redis.set(key, 0);
            console.log('Reset chunk counter after reaching 55 messages');
          } catch (error) {
            console.error('Error incrementing super summary counter:', error);
          }
        }

        return new Response(
          JSON.stringify({ count, shouldTriggerSummary: count >= 55 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const count = await redis.get(key) || 0;
        console.log('Retrieved count:', count);
        return new Response(
          JSON.stringify({ count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        await redis.set(key, 0);
        console.log('Reset count to 0');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in chunk-counter function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
