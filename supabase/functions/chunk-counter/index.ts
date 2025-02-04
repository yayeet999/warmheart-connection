
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

        // If we hit 55 messages
        if (count >= 55) {
          // First trigger chunk summarization
          console.log('Triggering chunk summarization');
          try {
            const summaryResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/chunk-summarizer`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                },
                body: JSON.stringify({ userId })
              }
            );
            
            if (!summaryResponse.ok) {
              throw new Error('Failed to trigger chunk summarization');
            }
            console.log('Chunk summarization completed');

            // Then increment super summary counter
            const superSummaryResponse = await fetch(
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
            
            if (!superSummaryResponse.ok) {
              throw new Error('Failed to increment super summary counter');
            }
            const superSummaryData = await superSummaryResponse.json();
            console.log('Super summary counter response:', superSummaryData);

            // If super summary counter hits 15, trigger super summarization
            if (superSummaryData.shouldTriggerSuperSummary) {
              console.log('Triggering super summarization');
              const superSummarizerResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/super_summarizer`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  },
                  body: JSON.stringify({ userId })
                }
              );

              if (!superSummarizerResponse.ok) {
                throw new Error('Failed to trigger super summarization');
              }
              console.log('Super summarization completed');
            }

            // Finally reset the chunk counter
            await redis.set(key, 0);
            console.log('Reset chunk counter after reaching 55 messages');
          } catch (error) {
            console.error('Error in 55-message processing:', error);
            // Even if there's an error, we should still return the current count
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
