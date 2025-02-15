import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function updateTokenBalance(userId: string, messageCount: number) {
  try {
    // Fetch user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, token_balance')
      .eq('user_id', userId)
      .single();

    if (subError) throw subError;

    // Only process for pro users
    if (subscription.tier !== 'pro') return;

    // Calculate token deduction (0.025 tokens per message)
    const deduction = messageCount * 0.025;

    // Update token balance
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        token_balance: subscription.token_balance - deduction,
        token_last_updated: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    console.log(`Updated token balance for user ${userId}. Deducted ${deduction} tokens`);
  } catch (error) {
    console.error('Error updating token balance:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Attempt Redis connection (for debugging)
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
        timestamp: new Date().toISOString()
      };

      const pushResult = await redis.lpush(key, JSON.stringify(messageToStore));
      console.log('Redis push result:', pushResult);

      await redis.ltrim(key, 0, 9999);

      const currentLength = await redis.llen(key);
      console.log('Current list length after adding message:', currentLength);

      // Only process token deduction for user messages every 5 messages
      if (message.type === 'user' && currentLength % 5 === 0) {
        console.log(`Processing token deduction at message count: ${currentLength}`);
        await updateTokenBalance(userId, 5);
      }

      // ---------------------------------------------------------------------
      // Trigger embedding if we just hit a multiple of 8 messages
      // ---------------------------------------------------------------------
      if (currentLength % 8 === 0) {
        console.log(`Reached a multiple of 8 (count = ${currentLength}), triggering embedding...`);
        try {
          const embedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/embed-conversation-chunk`;
          const res = await fetch(embedUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') ?? '',
            },
            body: JSON.stringify({ userId }),
          });
          if (!res.ok) {
            console.error('Embed function error:', await res.text());
          } else {
            console.log('Embed function called successfully.');
          }
        } catch (e) {
          console.error('Failed to call embed function:', e);
        }
      }

      // ---------------------------------------------------------------------
      // Trigger Overseer if we just hit a multiple of 5 messages
      // ---------------------------------------------------------------------
      if (currentLength % 5 === 0) {
        console.log(`Reached a multiple of 5 (count = ${currentLength}), triggering Overseer...`);
        try {
          const overseerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/overseer`;
          const res = await fetch(overseerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') ?? '',
            },
            body: JSON.stringify({ userId }),
          });
          if (!res.ok) {
            console.error('Overseer function error:', await res.text());
          } else {
            console.log('Overseer function called successfully.');
          }
        } catch (e) {
          console.error('Failed to call Overseer function:', e);
        }
      }

      // ---------------------------------------------------------------------
      // [NEW] Trigger "amorine_updater" every 100 messages, starting from 100
      // ---------------------------------------------------------------------
      if (currentLength >= 100 && currentLength % 100 === 0) {
        console.log(`Reached a multiple of 100 (count = ${currentLength}), triggering amorine_updater...`);
        try {
          const updaterUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/amorine_updater`;
          // Fire & forget (async)
          fetch(updaterUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') ?? '',
            },
            body: JSON.stringify({ userId }),
          })
            .then((res) => {
              if (!res.ok) {
                console.error('amorine_updater error:', res.status, res.statusText);
              } else {
                console.log('amorine_updater function called successfully.');
              }
            })
            .catch((err) => {
              console.error('Failed to call amorine_updater:', err);
            });
        } catch (e) {
          console.error('Failed to call amorine_updater function:', e);
        }
      }

      // Return success to client
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    else if (action === 'get') {
      console.log('Fetching messages for user:', userId, 'page:', page);

      const MESSAGES_PER_PAGE = 50;
      const MAX_MESSAGES = 300;

      // Calculate start/end indices
      const start = page * MESSAGES_PER_PAGE;
      const end = Math.min(start + MESSAGES_PER_PAGE - 1, MAX_MESSAGES - 1);

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

      // Reverse so oldest -> newest
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

    // If we get here, invalid action
    console.error('Invalid action requested:', action);
    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in chat-history function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
