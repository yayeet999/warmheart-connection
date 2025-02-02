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
    const { userId, message, action } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;

    if (action === 'add') {
      if (!message) {
        throw new Error('Message is required for add action');
      }

      // Add message to the front of the list and trim to 100 messages
      await redis.lpush(key, JSON.stringify(message));
      await redis.ltrim(key, 0, 99);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (action === 'get') {
      // Get the most recent 50 messages
      const messages = await redis.lrange(key, 0, 49);
      const parsedMessages = messages.map(msg => JSON.parse(msg));

      return new Response(
        JSON.stringify({ messages: parsedMessages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});