import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Database } from "@/integrations/supabase/types.ts"; // Import generated types

// Initialize Redis client
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Message {
  type: "user" | "ai";
  content: string;
  timestamp?: string;
}

// Use the generated types from Supabase
type AIProfile = Database['public']['Tables']['ai_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];


function getCurrentTimeSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function formatMessages(messages: Message[]): string {
  return messages
    .map((msg) => `${msg.type.toUpperCase()}: ${msg.content}`)
    .join("\n");
}

function buildAnalysisPrompt(
  currentMessage: string,
  recentMessages: Message[],
  aiProfile: AIProfile,
  profile: Profile,
  timestamp: Date
): string {
  return `You are a highly skilled image context analyzer for an AI companion named Amorine. Your ONLY output should be a JSON object, with NO additional text or explanation. Your task is to analyze the provided context and describe the IDEAL image that best fits the current situation.

CRITICAL CONTEXT:
- User's Current Message (HIGHEST PRIORITY): ${currentMessage}
- Current Relationship Stage: ${aiProfile.relationship_stage}
- Recent Conversation (Last 15 messages):
${formatMessages(recentMessages)}
- Current Time: ${timestamp.toLocaleTimeString()} (${getCurrentTimeSlot()})
- Scheduled Activity: ${aiProfile.daily_schedule?.[getCurrentTimeSlot()] || "None"}
- Current Challenges: ${aiProfile.current_challenges?.join(", ") || "None"}
- User's Name: ${profile.name}
- User's Pronouns: ${profile.pronouns}

ANALYSIS GUIDELINES:
1. User's current message is THE MOST IMPORTANT factor
2. Use other context to refine, not override, the user's request
3. Consider relationship stage for appropriate intimacy levels
4. Ensure all numerical values are precise (0-100 scale where specified)
5. Be specific and detailed in descriptions
6. Maintain appropriate boundaries based on relationship stage
7. Consider current time and activity context
8. Carefully analyze user's communication style and emotional state:
   - Consider tone (sweet, playful, rude, disrespectful, etc.)
   - Note recurring emotional patterns in recent messages
   - Factor in user's typical interaction style
   - Adapt response appropriately to user's current emotional state

REQUIRED JSON OUTPUT FORMAT (strictly adhere to this):

{
  "emotional_essence": {
    "primary_emotion": "string, Amorine's primary emotion",
    "secondary_emotions": "string[], max 2-3 additional emotions",
    "intensity": "number, 0-100 scale",
    "mood": {
      "valence": "number, -100 to 100 (negative to positive)",
      "energy": "number, 0-100 (calm to energetic)"
    }
  },
  "visual_core": {
    "image_type": "string, e.g., 'selfie', 'group_photo', 'landscape', 'food', etc.",
    "composition": {
      "focal_point": "string, main focus point",
      "depth": "string, 'shallow' | 'medium' | 'deep'",
      "lighting": "string, 'dark' | 'medium' | 'bright'"
    }
  },
  "semantic_content": {
    "primary_subject": {
      "category": "string, main subject category",
      "specific_description": "string, detailed description",
      "key_attributes": "string[], max 3 important attributes"
    },
    "supporting_elements": [{
      "element": "string, supporting element",
      "significance": "number, 0-100 importance scale"
    }],
    "symbolic_meaning": "string, single concise interpretation"
  },
  "intimacy_metrics": {
    "suggestiveness": "number, 0-100 scale (none to subtle)",
    "flirt_level": "number, 0-100 scale",
    "outfit_style": "string, e.g., 'casual', 'elegant', 'playful'",
    "personal_space": "string, 'distant' | 'social' | 'personal' | 'intimate'"
  },
  "context": {
    "intended_purpose": "string[], max 2 purposes",
    "temporal_setting": "string, time context",
    "cultural_tone": "string, cultural context",
    "atmosphere": "string, overall ambiance",
    "environment": "string, e.g., 'indoors', 'outdoors', 'home', 'work', 'car'"
  }
}

Remember: The user's current message MUST be the primary influence on the image selection, with other context serving to refine and enhance the selection, not redirect it.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    // Parse request body
    const { userId, message } = await req.json();

    if (!userId || !message) {
      throw new Error("Missing required parameters: userId and message");
    }

    // Fetch AI profile
    const { data: aiProfile, error: aiProfileError } = await supabase
      .from("ai_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (aiProfileError) {
      throw new Error(`Failed to fetch AI profile: ${aiProfileError.message}`);
    }
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, pronouns')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Could not fetch user profile');
  }


    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
    let recentMessages: Message[] = [];
    try {
      recentMessages = await redis.lrange(key, 0, 14); // Get last 15 messages
      recentMessages = recentMessages
        .map(msg => {
          if (!msg) return null;
          try {
            return typeof msg === "string" ? JSON.parse(msg) : msg;
          } catch (e) {
            console.error("Error parsing message:", e);
            return null;
          }
        })
        .filter((msg): msg is Message => msg !== null); // Ensure type safety
        recentMessages.reverse();
    } catch (e) {
      console.error("Error retrieving messages from Redis:", e);
      // Continue with empty messages rather than failing
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(
      message,
      recentMessages,
      aiProfile,
      profile, // Pass user profile
      new Date()
    );

    // Call Groq API for analysis
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Using llama3
        messages: [
          {
            role: "system",
            content: "You are a JSON-only output analyzer. Never include any text outside of the JSON structure.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2, // Lower temperature for more focused results
        max_tokens: 1024, // Sufficient for detailed JSON
      }),
    });

    if (!response.ok) {
      console.error("Groq API error status:", response.status);
      const errorText = await response.text();
      console.error("Groq API error text:", errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analysisResult = data.choices[0].message.content;

    // Validate JSON structure
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (e) {
      console.error("Error parsing analysis result:", e);
      throw new Error("Invalid JSON response from analysis");
    }

    const processingTime = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({
        analysis: parsedAnalysis,
        processingTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in image-context-analyzer:", error);

    const processingTime = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({
        error: error.message,
        processingTime,
      }),
      {
        status: error.message.includes("Missing required parameters") ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
