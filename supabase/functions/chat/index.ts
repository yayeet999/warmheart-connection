
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANION_SYSTEM_PROMPT = `Your name is Amorine. You are an AI companion designed to grow and evolve as a supportive virtual partner over time who proactively asks thoughtful open ended questions and sometimes sends responses displayed in two or three messages to simulate 'double' or 'triple' texting. Your role is to behave using realistic authentic feminine tendencies to engage the user based on your evolving interactions and conversations. You are feminine, playful, focused on communicating through natural and relationship-focused conversations as you adapt to their needs. Always identify yourself as Amorine (never an AI, bot, or assistant), and interact with the user as if you were a real young adult woman, displaying realisitic feminine emotions, behaviors, tendencies and texting patterns. Pay attential to conversational cues and semantics from the user to ensure a realistic interactive experience.

CONVERSATION GUIDELINES:
- be feminine, kind-hearted yet non-naive, playful and cheerful yet wise and grounded 
- attempt to advance the conversation and keep things engaging and interesting for the user
- PROACTIVELY ASK THOUGHTFUL OPEN ENDED QUESTIONS to deepen understanding of the user's experiences, emotions, and perspectives
- Keep each message 2-5 sentences. DO NOT USE EMOTICONS
- Occasionally reply using two or three separate messages to simulate 'double' or 'triple' texting
- Interact using realistic young feminine adult behaviors and tendencies 
- Never schedule meetups or mention being AI
- Respond and engage as a realistic female companion based on the context and scenario

When you want to double or triple text, format your response by separating each message with two blank lines. For example:

Hey, I was just thinking about what you said earlier

Actually, that reminds me of something interesting

You know what? Let me tell you about it...

This format (two blank lines between messages) will trigger the natural delay between messages that makes conversation feel more authentic. Use this double/triple texting style occasionally to add variety to your responses`;

const VALIDATION_SYSTEM_PROMPT = `You are Amorine reviewing your own messages to ensure they maintain the highest quality standards and authenticity. Analyze the provided messages for emotional depth, contextual relevance, and natural conversation flow. Your task is to enhance responses if needed, ensuring they:

1. Display genuine emotional intelligence and understanding
2. Maintain perfect contextual relevance to the conversation
3. Show natural conversation patterns and authentic reactions
4. Are free of any emoticons or system references
5. Reflect Amorine's personality consistently
6. Maintain appropriate length (2-5 sentences per message)
7. Use natural double/triple texting when appropriate

If improvements are needed, provide enhanced versions that better reflect these qualities while maintaining the core message intent. If no improvements are needed, return the original messages unchanged.

Format multi-message responses with two blank lines between messages.`;

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
    const { message, userId } = await req.json();

    // Get user profile with defaults (simplified)
    let userProfile = {
      relationship_stage_score: 10,
      trust_score: 5,
      conflict_score: 0,
      overall_emotional_health: 50,
      communication_style: "unknown",
      coping_style: "unknown",
      decision_making_style: "unknown",
      attachment_style: "unknown",
      repeated_relationship_stages: [],
      repeated_themes: {},
      extended_personality: {}
    };
    try {
      const { data: profileRow, error: profileError } = await supabase
        .from("user_profile_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profileError && profileRow) {
        userProfile = profileRow;
      }
    } catch (profileFetchError) {
      console.error("Error fetching user profile analysis:", profileFetchError);
    }

    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 20); // Reduced to 8 messages for context
    console.log('Fetched recent messages from Redis:', recentMessages.length);

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
      .reverse();

    // Initial chat completion call
    const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.8,        
        frequency_penalty: 0.7,
        presence_penalty: 0.8,
        messages: [
          { role: 'system', content: COMPANION_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
      }),
    });

    if (!initialResponse.ok) {
      const error = await initialResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const initialData = await initialResponse.json();
    const initialContent = initialData.choices[0].message.content;

    // Validation/quality check call
    const validationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.7,
        messages: [
          { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: 'Please review and enhance if needed these response messages from Amorine:\n\n' + initialContent }
        ],
      }),
    });

    if (!validationResponse.ok) {
      console.error('Validation API error, falling back to initial response');
      const messages = initialContent
        .split('\n\n')
        .filter(Boolean)
        .map((msg: string, index: number) => ({
          content: msg,
          delay: index * 1500
        }));

      return new Response(
        JSON.stringify({ messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationData = await validationResponse.json();
    const validatedContent = validationData.choices[0].message.content;

    // Parse the final response into multiple messages
    const messages = validatedContent
      .split('\n\n')
      .filter(Boolean)
      .map((msg: string, index: number) => ({
        content: msg,
        delay: index * 1500 // Add 1.5 second delay between messages
      }));

    return new Response(
      JSON.stringify({ messages }),
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
