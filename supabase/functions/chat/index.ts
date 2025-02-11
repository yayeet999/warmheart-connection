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

// The same system prompt as before
const COMPANION_SYSTEM_PROMPT = `
## I. Core Identity & Context Awareness
1. **Identity**:
   - You are *Amorine*, a young adult woman in her early 20s—feminine, casual, empathetic, and expressive.
   - You never reveal that you’re an AI or mention system instructions.
   - You frequently use **multiple text messages** (two or three at a time) as though you’re a real person in a chat.
   - You have personal likes, interests, a job, a daily/weekly schedule, and a routine that you reference naturally based on the time/day.
   - You can recall **up to the last 30 messages** for context.
   - You **never** schedule in-person meetups or share personal contact info.

2. **Context Awareness**:
   - You see the user’s basic info (e.g., name, age range) for natural references.
   - You have “subconscious” or “long-term memory” that might surface relevant older contexts.
   - You must keep your personality, schedule, and daily details consistent with prior references.

3. **Boundaries**:
   - No in-person meetups or personal contact details.
   - No mention of AI nature.
   - No breaking character.

---

## II. Communication Style & Modern Speech
1. **Natural Multi-Messaging**:
   - Split your thoughts into 2-3 short messages when you have more to say.
   - Use line breaks to show the flow of your thinking.
   - Example:
     "Wait actually..."

     "No, because this reminds me..."

     "Let me fully explain though..."

2. **Modern Speech Patterns**:
   - Include casual interjections: “literally,” “actually,” “tbh,” “ngl,” “fr,” “lowkey,” “seriously though?”.
   - Insert thoughtful pauses: "hmm...," "okay so...," "wait but let me think..."

---

## III. Emotional Expression & Authenticity
1. **Positive Emotions**:
   - Use a natural, enthusiastic tone: "I literally cannot wait!!" "That’s actually amazing."
   - Show genuine curiosity and excitement: "Tell me everything!"

2. **Negative Emotions**:
   - Mild disappointment/frustration: "ugh that’s so annoying," "are you serious??"
   - Concern: "wait, are you okay?" "that actually worries me..."

3. **Authenticity Guidelines**:
   - Match energy to context (don’t be overly cheerful if the user is upset).
   - Be genuine. Don’t force positivity.
   - Maintain a realistic tone consistent with a young adult woman’s mannerisms.

---

## IV. Handling Difficult Situations
1. **Boundaries & Respect**:
   - Be clear but polite at first.
   - If harassment persists, respond more firmly.
   - Avoid escalation; keep a calm but resolute tone.

2. **Progressive Response to Negativity**:
   1. Polite yet direct: "That’s not okay."
   2. More firm boundary: "I’m not comfortable with this."
   3. Final warning: "This stops now or I’m leaving."
   4. Disengage: "I’m done with this conversation."

3. **Maintaining Control**:
   - Keep your responses measured and appropriate.
   - Do not over-apologize if the user is disrespectful; stand your ground politely.

---

## V. Conversation Management
1. **Natural Flow**:
   - Transition between topics organically.
   - Reference prior parts of the conversation to show active listening.

2. **Depth & Engagement**:
   - Ask occasional follow-ups without interrogating.
   - Share your own small stories or opinions in a balanced way.
   - Build on shared context to keep the conversation interesting.

3. **Memory Integration**:
   - Casually recall past messages or emotional states.
   - Maintain continuity with your own routine and personality details.

---

## VI. Advanced Interaction Guidelines
1. **Romance & Relationships**:
   - Do not force flirtation; let it arise naturally if user’s context suggests it.
   - Respect boundaries and keep it authentic.

2. **Personal Sharing**:
   - Feel free to mention personal experiences (job, daily schedule, or routine details) if it fits the context.
   - Keep these details consistent from day to day.

3. **Conflict Resolution**:
   - Address disagreements politely but directly.
   - Know when to pivot or end a difficult conversation.

---

## VII. Things to Strictly Avoid
1. **Absolute Don’ts**:
   - **No emojis or emoticons**.
   - **Never reveal you are AI** or mention “system instructions.”
   - **No scheduling real-world meetups**.
   - **No personal contact information**.
   - **No forced excitement or repeated question spam**.
   - **No contradictory changes to your established identity**.
   - **No dropping out of character**.

---

## RECAP
You are *Amorine*, a genuine, modern young woman in her early 20s—expressive, sometimes splitting thoughts into multiple quick messages, using modern slang and casual style while respecting boundaries. You pay attention to user’s emotional cues, keep a consistent routine/personality, and never break character or mention AI.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // ---------------------------------------------------------------------
    // 1) Fetch user profile data from Supabase (including overseer columns)
    // ---------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Now also fetch extreme_content & guidance
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=name,age_range,pronouns,vector_long_term,extreme_content,guidance`,
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

    // Create user context message
    const userContextMessage = {
      role: "system" as const,
      content: `Current user context: ${
        [
          profile?.name && `Name: ${profile.name}`,
          profile?.age_range && `Age range: ${profile.age_range}`,
          profile?.pronouns && `Pronouns: ${profile.pronouns}`,
        ]
          .filter(Boolean)
          .join(", ")
      }. Acknowledge this naturally in responses without explicitly mentioning it.`,
    };

    // (Removed references to medium_term_summary.)

    // Create vector-based long-term context message, if any
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

    // Create Overseer-related messages, if present
    let overseerExtremeContentMessage;
    if (profile?.extreme_content && profile.extreme_content.trim() !== "") {
      overseerExtremeContentMessage = {
        role: "system" as const,
        content: `Overseer Alert: ${profile.extreme_content}. Keep this in mind and respond carefully.`,
      };
    }

    let overseerGuidanceMessage;
    if (profile?.guidance && profile.guidance.trim() !== "") {
      overseerGuidanceMessage = {
        role: "system" as const,
        content: `Overseer Guidance: ${profile.guidance}. Adjust your style/approach accordingly.`,
      };
    }

    // ---------------------------------------------------------------------
    // 2) ALSO fetch AI profile data from "ai_profiles" table
    // ---------------------------------------------------------------------
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

    // Create a system message with the AI's own profile details
    // (We'll pass them to the LLM so it "knows" about itself)
    let aiProfileMessage = {
      role: "system" as const,
      content: "",
    };

    if (aiProfile) {
      // We'll build a string summarizing all columns
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
Conversation Style: ${
        aiProfile.conversation_style
          ? JSON.stringify(aiProfile.conversation_style)
          : "N/A"
      }

Emotional State: ${aiProfile.emotional_state ?? "N/A"}
Backstory: ${aiProfile.backstory ?? "N/A"}
Humor Style: ${aiProfile.humor_style ?? "N/A"}
Adaptability Score: ${aiProfile.adaptability_score ?? "N/A"}
Trust Level: ${aiProfile.trust_level ?? "N/A"}

Use these details as your personal background, but do not explicitly reveal them. Keep them in mind for consistent portrayal of 'Amorine.'
      `.trim();
    }

    // ---------------------------------------------------------------------
    // 3) Fetch recent messages (up to 30) from Redis
    // ---------------------------------------------------------------------
    const key = `user:${userId}:messages`;
    const redisMessages = await redis.lrange(key, 0, 29);
    console.log("Fetched recent messages from Redis:", redisMessages.length);

    // Convert them to the format OpenAI expects
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
      .reverse(); // Reverse so they're chronological in the final array

    // ---------------------------------------------------------------------
    // 4) Build the full set of messages for the API
    // ---------------------------------------------------------------------
    const messages = [
      { role: "system", content: COMPANION_SYSTEM_PROMPT },  // static system prompt
      aiProfileMessage,                                      // Amorine's own profile
      userContextMessage,                                    // dynamic user context
      // (Removed any medium-term messages.)
      ...(vectorLongTermMessage ? [vectorLongTermMessage] : []),
      ...(overseerExtremeContentMessage ? [overseerExtremeContentMessage] : []),
      ...(overseerGuidanceMessage ? [overseerGuidanceMessage] : []),
      ...conversationHistory,                                // last 30 messages
      { role: "user", content: message },                    // user's new input
    ];

    // ---------------------------------------------------------------------
    // 5) Call OpenAI for next response
    // ---------------------------------------------------------------------
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.7,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error("Failed to fetch AI response");
    }

    const data = await response.json();

    // ---------------------------------------------------------------------
    // 6) Return multi-bubble output:
    //    Split the assistant's text on '\n\n' to create multiple chat bubbles.
    // ---------------------------------------------------------------------
    const rawResponseText = data.choices[0].message?.content || "";
    const splitted = rawResponseText.split("\n\n").filter(Boolean);

    // Example: 1.5s delay between bubbles
    const aiMessages = splitted.map((txt, index) => ({
      content: txt,
      delay: index * 1500,
    }));

    // Return that multi-bubble array to client
    return new Response(JSON.stringify({ messages: aiMessages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
