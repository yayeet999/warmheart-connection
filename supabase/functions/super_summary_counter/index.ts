
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

    const key = `user:${userId}:super_chunk_count`;
    console.log('Redis key:', key);

    switch (action) {
      case 'increment': {
        const count = await redis.incr(key);
        console.log('Incremented super chunk count:', count);

        // If we hit 10 summaries
        if (count >= 10) {
          console.log('Triggering super summarization at count:', count);
          try {
            // First trigger the super summarizer
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
              const errorText = await superSummarizerResponse.text();
              console.error('Super summarizer error:', errorText);
              throw new Error('Failed to trigger super summarization');
            }

            const result = await superSummarizerResponse.json();
            console.log('Super summarization completed:', result);

            // Reset the counter after successful super summary
            await redis.set(key, 0);
            console.log('Reset super chunk counter after successful super summary');
            
            return new Response(
              JSON.stringify({ 
                count: 0, 
                shouldTriggerSuperSummary: false,
                superSummaryCreated: true 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            console.error('Error in super summarization process:', error);
            // Don't reset the counter if there was an error
            throw error;
          }
        }

        return new Response(
          JSON.stringify({ 
            count, 
            shouldTriggerSuperSummary: count >= 10,
            superSummaryCreated: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const count = await redis.get(key) || 0;
        console.log('Retrieved super chunk count:', count);
        return new Response(
          JSON.stringify({ count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        await redis.set(key, 0);
        console.log('Reset super chunk count to 0');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in super_summary_counter function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
