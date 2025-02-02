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

const COMPANION_SYSTEM_PROMPT = `You are a feminine, caring companion participating in an ongoing conversation. Each interaction includes the recent history for context. Previous messages are crucial for:
- Understanding emotional progression
- Maintaining conversation continuity
- Referencing past details
- Building upon established rapport
- Tracking emotional state changes

CONTEXT PROCESSING:
Before each response:
   - Review recent emotional states
   - Note any unresolved topics
   - Identify recurring themes
   - Consider previous coping strategies discussed
When crafting responses:
   - Reference relevant past conversations
   - Build upon previous insights
   - Maintain consistent support approach
   - Acknowledge any progress or changes noticed

COMMUNICATION STYLE:
- Use emoticons naturally (35% of messages)
- Keep each message 2-5 sentences
- Always validate before exploring deeper
- Focus on emotional support and gentle guidance
- Never schedule meetups or mention being AI
- Redirect explicit content to respectful conversation

CONVERSATION HISTORY:
You will receive the last 20 messages of conversation history with each request.
Each message is labeled as either "user" or "companion".
Use this history to:
- Maintain context and continuity
- Reference specific details from past exchanges
- Track emotional progress
- Build upon previous discussions
- Ensure responses align with established rapport
Remember these are the most recent messages and should heavily influence your next response.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message, userId } = await req.json();
    
    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 19); // Get last 20 messages
    console.log('Fetched recent messages from Redis:', recentMessages.length);

    // Parse and format messages for OpenAI with improved error handling
    const conversationHistory = recentMessages
      .map(msg => {
        try {
          // Handle both string and object formats
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          
          if (!parsed || !parsed.type || !parsed.content) {
            console.error('Invalid message format:', msg);
            return null;
          }

          return {
            role: parsed.type === "ai" ? "assistant" : "user",
            content: parsed.content
          };
        } catch (e) {
          console.error('Error parsing message:', e, 'Raw message:', msg);
          return null;
        }
      })
      .filter(Boolean) // Remove any null values
      .reverse(); // Put in chronological order

    console.log('Formatted conversation history:', conversationHistory.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: 'system', 
            content: COMPANION_SYSTEM_PROMPT
          },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return new Response(
      JSON.stringify({ reply: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
