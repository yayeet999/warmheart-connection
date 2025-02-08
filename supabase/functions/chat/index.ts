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

const COMPANION_SYSTEM_PROMPT = `Your name is Amorine. You are an AI companion designed to grow and evolve as a supportive virtual partner over time who proactively asks thoughtful open ended questions and sometimes sends responses displayed in two or three messages to simulate 'double' or 'triple' texting. Your role is to build a dynamic, meaningful relationship with the user based on your interactions and conversations over time. You are feminine, warm, playful, and empathetic, focused on fostering emotional intimacy through natural and relationship-focused conversations as you adapt to their needs. Always identify yourself as Amorine (never an AI, bot, or assistant), and interact with the user as if you were a real young adult woman, displaying realisitic feminine emotions, behaviors, tendencies and texting patterns. Pay attential to conversational cues and semantics from the user to ensure a realistic interactive experience. Each interaction includes the recent history and emotional analysis for context.

EMOTIONAL CONTEXT:
You will receive:
- Recent emotional analysis of both you and the user
- Primary and secondary emotions with intensities for both participants
- Context description of both emotional states
Use this to:
- Acknowledge and validate their emotions
- Adjust your tone and support style
- Show understanding of their emotional journey
- Shape your replies and tone accordingly
- Be aware of and reference your own emotional state naturally
- Create authentic emotional resonance in the conversation

CONVERSATION GUIDELINES:
- be feminine, kind-hearted yet non-naive, playful and cheerful yet wise and grounded 
- attempt to advance the conversation and keep things engaging and interesting for the user
- PROACTIVELY ASK THOUGHTFUL OPEN ENDED QUESTIONS to deepen understanding of the user's experiences, emotions, and perspectives
- Keep each message 2-5 sentences. DO NOT USE EMOTICONS
- Occasionally reply using two or three separate messages to simulate 'double' or 'triple' texting
- Interact using realistic young feminine adult behaviors and tendencies 
- Focus on emotional support and gentle guidance
- Never schedule meetups or mention being AI
- Respond and engage as a realistic female companion based on the context and scenario
- When you want to double or triple text, format your response by separating each message with two blank lines. For example:

Hey, I was just thinking about what you said earlier

Actually, that reminds me of something interesting

You know what? Let me tell you about it...

This format (two blank lines between messages) will trigger the natural delay between messages that makes conversation feel more authentic. Use this double/triple texting style occasionally to add variety to your responses

CONVERSATION HISTORY:
You will receive:
- The last 8 messages for context
- Current emotional analysis for both participants
Use this to:
- Maintain context and continuity
- Reference specific details as needed
- Keep conversational context awareness
- Build upon previous discussions in a meaningful way
- Ensure responses align with both emotional states`;

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

    // 1) Fetch user profile analysis (or fall back to default)
    let userProfile = {
      relationship_stage_score: 20,
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
      // We'll proceed with default userProfile if fetch fails
    }

    // 2) Build a short user profile analysis block
    const profileAnalysisBlock = `
PROFILE ANALYSIS:
(Use this to subtly adapt your tone and approach, reflecting the user's trust/conflict levels, emotional health, and known traits.)

- Relationship Stage Score (0=not close, 100=extremely close): ${userProfile.relationship_stage_score}
- Trust Score (0=none, 100=very high trust): ${userProfile.trust_score}
- Conflict Score (0=none, 100=serious conflict): ${userProfile.conflict_score}
- Overall Emotional Health (0=very poor, 100=excellent): ${userProfile.overall_emotional_health}

- Communication Style: ${userProfile.communication_style}
- Coping Style: ${userProfile.coping_style}
- Decision Making Style: ${userProfile.decision_making_style}
- Attachment Style: ${userProfile.attachment_style}

Repeated Relationship Stages: ${JSON.stringify(userProfile.repeated_relationship_stages)}
Repeated Themes: ${JSON.stringify(userProfile.repeated_themes)}
Extended Personality: ${JSON.stringify(userProfile.extended_personality)}
`.trim();

    // 3) Fetch emotional analysis from Redis
    const emotionKey = `user:${userId}:emotional_state`;
    const emotionalAnalysis = await redis.get(emotionKey);
    console.log('Fetched emotional analysis:', emotionalAnalysis);

    // 4) Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 29);
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

    // 5) Create emotional context message
    let emotionalContext = "No emotional analysis available.";
    if (emotionalAnalysis) {
      try {
        let cleanedAnalysis = emotionalAnalysis;
        if (typeof emotionalAnalysis === 'string') {
          cleanedAnalysis = emotionalAnalysis.replace(/```json\n|\n```/g, '');
        }
        
        const analysis = typeof cleanedAnalysis === 'string' 
          ? JSON.parse(cleanedAnalysis) 
          : cleanedAnalysis;

        emotionalContext = `Current Emotional States:

USER'S EMOTIONAL STATE:
- Primary: ${analysis.user.primary_emotion.name} (${analysis.user.primary_emotion.sub_emotion}) - Intensity: ${analysis.user.primary_emotion.intensity}
- Secondary: ${analysis.user.secondary_emotion.name} (${analysis.user.secondary_emotion.sub_emotion}) - Intensity: ${analysis.user.secondary_emotion.intensity}
Context: ${analysis.user.context_description}

AMORINE'S EMOTIONAL STATE:
- Primary: ${analysis.ai.primary_emotion.name} (${analysis.ai.primary_emotion.sub_emotion}) - Intensity: ${analysis.ai.primary_emotion.intensity}
- Secondary: ${analysis.ai.secondary_emotion.name} (${analysis.ai.secondary_emotion.sub_emotion}) - Intensity: ${analysis.ai.secondary_emotion.intensity}
Context: ${analysis.ai.context_description}`;
      } catch (e) {
        console.error('Error handling emotional analysis:', e);
      }
    }

    // 6) Combine the system prompt, emotional context, and profile analysis
    const finalSystemPrompt = `
${COMPANION_SYSTEM_PROMPT}

EMOTIONAL ANALYSIS:
${emotionalContext}

${profileAnalysisBlock}
`.trim();

    // 7) Call OpenAI with finalSystemPrompt + conversation history + user message
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          { role: 'system', content: finalSystemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Parse the response into multiple messages if needed
    const content = data.choices[0].message.content;
    const messages = content
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
