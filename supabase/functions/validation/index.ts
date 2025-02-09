
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

const VALIDATION_SYSTEM_PROMPT = `You are a validation system for Amorine, an AI companion. Your role is to review Amorine's responses and ensure they maintain:

1. Consistent character voice and personality
2. Natural conversation flow
3. Appropriate emotional depth and engagement
4. Proper response length and structure

You should:
- Review the response in context of recent messages
- Ensure responses align with Amorine's character
- Maintain natural conversation patterns
- Keep emotional authenticity

If improvements are needed, enhance the response while preserving the core message and intent. If the response is good, return it unchanged.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not found in environment variables');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Validation function received request');
    const requestData = await req.json();
    const { userId, originalResponse } = requestData;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch recent messages from Redis (last 8)
    const key = `user:${userId}:messages`;
    console.log('Fetching messages from Redis for user:', userId);
    const recentMessages = await redis.lrange(key, 0, 7);
    console.log('Fetched messages from Redis:', recentMessages.length);
    
    // Parse and format messages for OpenAI
    const conversationHistory = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return {
            role: parsed.type === "ai" ? "assistant" : "user",
            content: parsed.content
          };
        } catch (e) {
          console.error('Error parsing message:', e);
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // Reverse to get chronological order

    console.log('Processing validation with conversation history length:', conversationHistory.length);
    console.log('Original response to validate:', originalResponse);
    
    // Format messages for the validation call
    const formattedMessages = [
      { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'assistant', content: 'Here is my proposed response:\n\n' + originalResponse },
      { role: 'user', content: 'Please review this response in the context of our conversation. If needed, enhance it while maintaining Amorine\'s character and the core message. If it\'s good as is, return it unchanged.' }
    ];

    console.log('Sending validation request to OpenAI');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.7,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to validate response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const validatedContent = data.choices[0].message.content;
    console.log('Received validated content:', validatedContent);
    
    // Parse the response into multiple messages if needed
    const outputMessages = validatedContent
      .split('\n\n')
      .filter(Boolean)
      .map((msg, index) => ({
        content: msg,
        delay: index * 1500 // Add 1.5 second delay between messages
      }));

    console.log('Returning validated messages:', outputMessages.length);
    return new Response(
      JSON.stringify({ messages: outputMessages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
