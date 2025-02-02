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
    // Test Redis connection
    try {
      await redis.ping();
      console.log('Redis connection successful');
    } catch (redisError) {
      console.error('Redis connection failed:', redisError);
      throw new Error('Redis connection failed');
    }

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

      console.log('Adding message to Redis:', { 
        userId, 
        messageType: message.type, 
        content: message.content
      });
      
      // Store message directly without additional stringification
      const pushResult = await redis.lpush(key, JSON.stringify(message));
      console.log('Redis push result:', pushResult);
      
      const currentLength = await redis.llen(key);
      console.log('Current list length after add:', currentLength);
      
      // Trim to keep last 100 messages
      await redis.ltrim(key, 0, 99);

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
      
      const listLength = await redis.llen(key);
      console.log('Total messages in Redis:', listLength);
      
      const messages = await redis.lrange(key, 0, 49);
      console.log('Retrieved messages from Redis:', messages.length);
      
      // Parse the messages, handling potential JSON parsing errors
      const parsedMessages = messages.map(msg => {
        try {
          // If the message is already an object, return it directly
          if (typeof msg === 'object') return msg;
          // Otherwise, try to parse it
          return JSON.parse(msg);
        } catch (e) {
          console.error('Error parsing message:', e, 'Raw message:', msg);
          return null;
        }
      }).filter(Boolean); // Remove any null values from parsing errors

      console.log('Successfully parsed messages count:', parsedMessages.length);

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
