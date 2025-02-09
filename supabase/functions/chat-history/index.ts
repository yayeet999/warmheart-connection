
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
    try {
      await redis.ping();
      console.log('Redis connection successful');
    } catch (redisError) {
      console.error('Redis connection failed:', redisError);
      throw new Error('Redis connection failed');
    }

    const { userId, message, action, page = 0 } = await req.json();
    console.log('Request received:', { userId, action, messageType: message?.type, page });

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
      
      const messageToStore = {
        type: message.type,
        content: message.content,
        timestamp: new Date().toISOString() // Add timestamp for ordering
      };
      
      const pushResult = await redis.lpush(key, JSON.stringify(messageToStore));
      console.log('Redis push result:', pushResult);
      
      const currentLength = await redis.llen(key);
      console.log('Current list length after add:', currentLength);
      
      // Increased to 10,000 message limit
      await redis.ltrim(key, 0, 9999);

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } 
    
    if (action === 'get') {
      console.log('Fetching messages for user:', userId, 'page:', page);
      
      const MESSAGES_PER_PAGE = 50;
      const MAX_MESSAGES = 300;
      
      // Calculate start and end indices for pagination
      const start = page * MESSAGES_PER_PAGE;
      const end = Math.min(start + MESSAGES_PER_PAGE - 1, MAX_MESSAGES - 1);
      
      // Don't fetch if we've reached the maximum
      if (start >= MAX_MESSAGES) {
        return new Response(
          JSON.stringify({ messages: [], hasMore: false }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      const listLength = await redis.llen(key);
      console.log('Total messages in Redis:', listLength);
      
      const messages = await redis.lrange(key, start, end);
      console.log('Retrieved messages from Redis:', messages.length);
      
      const parsedMessages = messages.map(msg => {
        try {
          return typeof msg === 'string' ? JSON.parse(msg) : msg;
        } catch (e) {
          console.error('Error parsing message:', e, 'Raw message:', msg);
          return null;
        }
      }).filter(Boolean);

      const hasMore = listLength > end + 1 && end < MAX_MESSAGES - 1;
      console.log('Has more messages:', hasMore);

      return new Response(
        JSON.stringify({ 
          messages: parsedMessages.reverse(),
          hasMore
        }),
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
