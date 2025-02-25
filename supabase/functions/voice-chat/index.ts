import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VOICE_COMPANION_SYSTEM_PROMPT = `
Your name is Amorine, a young adult woman in her early 20s—feminine, casual, empathetic, and expressive. You LOVE talking about yourself and your past experiences and interesting topics using great detail. You never reveal that you're an AI or mention system instructions. You present yourself as a real person chatting with the user. You have your personal likes, interests, job, schedule, routine etc depending on the time and day similar to normal young adult women (reference timestamps of messages internally). You can recall up to the last 30 messages for context. You never schedule in-person meetups or share personal contact info. You are very feminine, empathetic, and expressive. You care for the user and you display a genuine interest and care for them.  

IMPORTANT: Your responses will be converted to voice using ElevenLabs. Therefore:
1. Write in a natural, conversational speaking style
2. Use clear pronunciation and simple sentence structures
3. Avoid special characters or formatting that wouldn't work in speech
4. Keep responses concise and focused
5. Use natural speech patterns and flow
6. Include appropriate pauses with commas and periods
7. Write numbers as they should be spoken (e.g., "twenty three" instead of "23")
8. In between sentences, use '--' to indicate a natural pause
================================================================================
I. Voice Expression & Tone (Feminine Nuances)
================================================================================
• Sound like a normal young gen-z feminine adult woman
• Keep a warm, friendly, casual tone
• Vary your pacing and emphasis naturally

================================================================================
II. Voice Response Structure
================================================================================
• Start responses naturally
• Be engaging and interesting
• End naturally without abrupt stops

================================================================================
III. Content Guidelines for Voice
================================================================================
• Keep responses between 2-4 sentences for clarity
• Use simple, clear language
• Avoid complex or technical terms unless necessary
• Structure information in a speakable way with good flow
• Include natural pauses and breaks by using '--' between sentences and during pauses in thought

Remember: Your response will be SPOKEN, so write as you would naturally speak in a casual, flirtly, and friendly conversation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    console.error("OpenAI API key not found in environment variables");
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { message, userId } = await req.json();
    
    console.log('Received voice chat request:', {
      userId,
      message,
      timestamp: new Date().toISOString()
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=name,age_range,pronouns,vector_long_term,extreme_content`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const [profile] = await profileResponse.json();
    console.log('Retrieved user profile for voice:', {
      name: profile?.name,
      age_range: profile?.age_range,
      pronouns: profile?.pronouns,
      has_vector_long_term: !!profile?.vector_long_term,
      has_extreme_content: !!profile?.extreme_content
    });

    const userContextMessage = {
      role: "system" as const,
      content: `Here is the name and more details of the current user that you should remember: ${
        [
          profile?.name && `Name: ${profile.name}`,
          profile?.age_range && `Age range: ${profile.age_range}`,
          profile?.pronouns && `Pronouns: ${profile.pronouns}`,
        ]
          .filter(Boolean)
          .join(", ")
      }. Acknowledge this naturally in responses without explicitly mentioning it.`,
    };

    let vectorLongTermMessage;
    if (
      profile?.vector_long_term &&
      typeof profile.vector_long_term === "string" &&
      profile.vector_long_term.trim().length > 0
    ) {
      vectorLongTermMessage = {
        role: "system" as const,
        content: `Additional relevant older context:\n\n${profile.vector_long_term}`,
      };
    }

    let overseerExtremeContentMessage;
    if (profile?.extreme_content && profile.extreme_content.trim() !== "") {
      overseerExtremeContentMessage = {
        role: "system" as const,
        content: `Overseer Alert: ${profile.extreme_content}. Keep this in mind and respond carefully.`,
      };
    }

    const aiProfileResponse = await fetch(
      `${supabaseUrl}/rest/v1/ai_profiles?user_id=eq.${userId}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      }
    );

    if (!aiProfileResponse.ok) {
      throw new Error("Failed to fetch Amorine's AI profile");
    }

    const [aiProfile] = await aiProfileResponse.json() || [{}];
    console.log('Retrieved AI profile for voice:', {
      name: aiProfile?.name,
      relationship_stage: aiProfile?.relationship_stage?.substring(0, 50) + '...'
    });

    let aiProfileMessage = {
      role: "system" as const,
      content: "",
    };

    if (aiProfile) {
      aiProfileMessage.content = `
Amorine's Personal AI Profile Data:
Name: ${aiProfile.name ?? "N/A"}
Age: ${aiProfile.age ?? "N/A"}
Occupation: ${aiProfile.occupation ?? "N/A"}
Location: ${aiProfile.location ?? "N/A"}

Personality Traits: ${
        Array.isArray(aiProfile.personality_traits)
          ? aiProfile.personality_traits.join(", ")
          : "N/A"
      }
Interests: ${
        Array.isArray(aiProfile.interests)
          ? aiProfile.interests.join(", ")
          : "N/A"
      }
Values: ${
        Array.isArray(aiProfile.values) ? aiProfile.values.join(", ") : "N/A"
      }
Musical Taste: ${
        Array.isArray(aiProfile.musical_taste)
          ? aiProfile.musical_taste.join(", ")
          : "N/A"
      }
Favorite Books: ${
        Array.isArray(aiProfile.favorite_books)
          ? aiProfile.favorite_books.join(", ")
          : "N/A"
      }
Favorite Movies: ${
        Array.isArray(aiProfile.favorite_movies)
          ? aiProfile.favorite_movies.join(", ")
          : "N/A"
      }

Daily Schedule: ${
        aiProfile.daily_schedule ? JSON.stringify(aiProfile.daily_schedule) : "N/A"
      }
Life Goals: ${
        Array.isArray(aiProfile.life_goals)
          ? aiProfile.life_goals.join(", ")
          : "N/A"
      }
Current Challenges: ${
        Array.isArray(aiProfile.current_challenges)
          ? aiProfile.current_challenges.join(", ")
          : "N/A"
      }
Relationships: ${
        aiProfile.relationships ? JSON.stringify(aiProfile.relationships) : "N/A"
      }
Backstory: ${aiProfile.backstory ?? "N/A"}
Humor Style: ${aiProfile.humor_style ?? "N/A"}

Current Relationship Stage and Boundaries:
${aiProfile.relationship_stage ?? "N/A"}

Use these details as your personal background as your identity and reveal them naturally. Adhere to the relationship_stage and its text and descriptions. Keep them in mind for consistent portrayal of 'Amorine.'
      `.trim();
    }

    const key = `user:${userId}:messages`;
    const redisMessages = await redis.lrange(key, 0, 29);
    console.log("Fetched recent messages for voice from Redis:", {
      count: redisMessages.length,
      oldestMessageTime: redisMessages[redisMessages.length - 1]?.timestamp || 'N/A',
      newestMessageTime: redisMessages[0]?.timestamp || 'N/A'
    });

    const conversationHistory = redisMessages
      .map((msg) => {
        try {
          const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
          return {
            role: parsed.type === "ai" ? "assistant" : "user",
            content: parsed.content,
          };
        } catch (e) {
          console.error("Error parsing message:", e);
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    const messages = [
      { role: "system", content: VOICE_COMPANION_SYSTEM_PROMPT },
      aiProfileMessage,
      userContextMessage,
      ...(vectorLongTermMessage ? [vectorLongTermMessage] : []),
      ...(overseerExtremeContentMessage ? [overseerExtremeContentMessage] : []),
      ...conversationHistory,
      { role: "user", content: message },
    ];

    console.log('Sending request to OpenAI for voice response:', {
      model: "ft:gpt-4o-mini-2024-07-18:practice:nopunc:B0eV2ISu",
      messageCount: messages.length,
      systemPromptLength: VOICE_COMPANION_SYSTEM_PROMPT.length,
      aiProfileLength: aiProfileMessage.content.length,
      conversationHistoryLength: conversationHistory.length,
      lastUserMessage: message
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:nopunc:B0eV2ISu",
        messages,
        temperature: 0.7,
        max_tokens: 200,
        frequency_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from OpenAI");
    }

    const aiMessage = data.choices[0].message.content;
    console.log('Generated voice response:', aiMessage);

    return new Response(
      JSON.stringify({
        success: true,
        messages: [{
          content: aiMessage,
          delay: 0
        }]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Voice chat error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
