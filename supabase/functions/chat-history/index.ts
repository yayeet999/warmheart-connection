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
    const { userId, message, action } = await req.json();
    console.log('Request received:', { userId, action, messageType: message?.type });

    if (!userId) {
      console.error('Missing userId in request');
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;
    console.log('Redis key:', key);

    if (action === 'add') {
      if (!message) {
        console.error('Missing message in add request');
        throw new Error('Message is required for add action');
      }

      console.log('Adding message to Redis:', { userId, messageType: message.type, content: message.content });
      
      // Add message to Redis and log the result
      const pushResult = await redis.lpush(key, JSON.stringify(message));
      console.log('Redis push result:', pushResult);
      
      // Trim the list and log the result
      const trimResult = await redis.ltrim(key, 0, 99);
      console.log('Redis trim result:', trimResult);

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } 
    
    if (action === 'get') {
      console.log('Fetching messages for user:', userId);
      
      // Get all messages in the list first to check if any exist
      const listLength = await redis.llen(key);
      console.log('Total messages in Redis:', listLength);
      
      // Get the most recent 50 messages
      const messages = await redis.lrange(key, 0, 49);
      console.log('Retrieved messages from Redis:', messages.length);
      
      const parsedMessages = messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch (e) {
          console.error('Error parsing message:', e);
          return null;
        }
      }).filter(msg => msg !== null);

      console.log('Parsed messages count:', parsedMessages.length);

      return new Response(
        JSON.stringify({ messages: parsedMessages.reverse() }), // Reverse to show oldest first
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.error('Invalid action requested:', action);
    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in chat-history function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});