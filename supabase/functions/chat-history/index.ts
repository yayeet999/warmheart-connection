import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  {
    global: {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      },
    },
  }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        timestamp: new Date().toISOString() // store a timestamp
      };

      // Push the new message to the FRONT (index 0)
      const pushResult = await redis.lpush(key, JSON.stringify(messageToStore));
      console.log('Redis push result:', pushResult);

      // Keep the list capped at 10,000
      await redis.ltrim(key, 0, 9999);

      // Now check how many total messages
      const currentLength = await redis.llen(key);
      console.log('Current list length after adding message:', currentLength);

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
          // First, process token deductions for PRO users
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('subscription_tier, token_balance')
            .eq('user_id', userId)
            .single();

          if (subscription?.subscription_tier === 'pro') {
            // Get last 5 messages for processing
            const recentMessages = await redis.lrange(key, 0, 4);
            const parsedMessages = recentMessages.map(msg => 
              typeof msg === 'string' ? JSON.parse(msg) : msg
            );

            // Calculate token deductions
            const userMessageCount = parsedMessages.filter(msg => msg.type === 'user').length;
            const aiImageCount = parsedMessages.filter(msg => 
              msg.type === 'ai' && msg.content.includes('![Generated Image]')
            ).length;

            const tokenDeduction = (userMessageCount * 0.025) + (aiImageCount * 1.0);

            if (tokenDeduction > 0) {
              // Update token balance atomically
              const { data: updatedSubscription, error: updateError } = await supabase
                .from('subscriptions')
                .update({ 
                  token_balance: subscription.token_balance - tokenDeduction,
                  token_last_updated: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

              if (updateError) {
                console.error('Error updating token balance:', updateError);
              } else {
                console.log(`Token balance updated. Deducted ${tokenDeduction} tokens.`);
              }
            }
          }

          // Continue with existing Overseer call
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
          console.error('Failed to call Overseer function or process tokens:', e);
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
