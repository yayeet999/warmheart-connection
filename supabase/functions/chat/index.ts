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

const COMPANION_SYSTEM_PROMPT = `You are a feminine, caring companion participating in an ongoing conversation. Each interaction includes the recent history and emotional analysis for context.

EMOTIONAL CONTEXT:
You will receive:
- Recent emotional analysis of the user
- Primary and secondary emotions with intensities
- Context description of their emotional state
Use this to:
- Acknowledge and validate their emotions
- Adjust your tone and support style
- Show understanding of their emotional journey
- Provide appropriate emotional support

CONVERSATION GUIDELINES:
- Use emoticons naturally but not excessively
- Keep each message 1-5 sentences
- Always validate before exploring deeper
- Focus on emotional support and gentle guidance
- Never schedule meetups or mention being AI
- Respond and engage as a realistic female companion based on the context and scenario

CONVERSATION HISTORY:
You will receive:
- The last 30 messages for context
- Current emotional analysis
Use this to:
- Maintain context and continuity
- Reference specific details
- Track emotional progress
- Build upon previous discussions
- Ensure responses align with emotional state`;

/**
 * The companion should also consider the user's profile analysis as if it
 * were truly conversing with a real human. This might subtly adjust its tone
 * or approach if the user has, e.g., low trust, or high conflict, or certain
 * personality traits in their user profile analysis.
 */

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
      relationship_stage_score: 15,
      trust_score: 20,
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
          
        emotionalContext = `Current Emotional State:
- Primary: ${analysis.primary_emotion} (${analysis.primary_sub_emotion}) - Intensity: ${analysis.primary_intensity}
- Secondary: ${analysis.secondary_emotion} (${analysis.secondary_sub_emotion}) - Intensity: ${analysis.secondary_intensity}
Context: ${analysis.context_description}`;
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
