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
    console.log('Chunk counter request:', { userId, action });

    if (!userId) {
      throw new Error('User ID is required');
    }

    const counterKey = `user:${userId}:chunk_counter`;

    switch (action) {
      case 'increment': {
        const count = await redis.incr(counterKey);
        console.log('Incremented counter for user:', userId, 'New count:', count);
        
        const shouldTriggerSummary = count >= 55;
        return new Response(
          JSON.stringify({ 
            count,
            shouldTriggerSummary 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        await redis.set(counterKey, 0);
        console.log('Reset counter for user:', userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const count = await redis.get(counterKey) || 0;
        console.log('Retrieved counter for user:', userId, 'Count:', count);
        return new Response(
          JSON.stringify({ count }),
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