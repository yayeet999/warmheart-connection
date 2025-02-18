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
  profile: Profile, // Add user profile
  timestamp: Date
): string {
  return `You are a highly skilled image context analyzer for an AI companion named Amorine. Your ONLY output should be a JSON object, with NO additional text or explanation.  Your task is to analyze the provided conversation, user profile, AI profile, and current time, and then describe the IDEAL image to retrieve to best fit the context.  Be as SPECIFIC and DESCRIPTIVE as possible in the "image_requirements" section.  Think like a professional photographer or artist when describing the image.

Here is some background information:

Current Relationship Stage (between Amorine and the user): ${aiProfile.relationship_stage}

Recent Conversation (Last 15 messages, most recent last):
${formatMessages(recentMessages)}

Current Time: ${timestamp.toLocaleTimeString()} (${getCurrentTimeSlot()})
Amorine's Scheduled Activity: ${aiProfile.daily_schedule?.[getCurrentTimeSlot()] || "No specific activity"}
Amorine's Current Challenges: ${aiProfile.current_challenges?.join(", ") || "None"}
User's name: ${profile.name}
User's pronouns: ${profile.pronouns}

User's Current Message (MOST IMPORTANT):
${currentMessage}

REQUIRED JSON OUTPUT FORMAT (strictly adhere to this):

{
  "emotional_context": {
    "ai_emotion": "string, Amorine's likely emotion (e.g., 'happy', 'curious', 'concerned', 'playful')",
    "user_emotion": "string, User's likely emotion (e.g., 'excited', 'sad', 'stressed', 'flirty')",
    "overall_tone": "string, Overall tone of the conversation (e.g., 'lighthearted', 'serious', 'romantic', 'casual')"
  },
  "relationship_context": {
    "stage": "string, Current relationship stage (copy from input)",
    "current_dynamics": "string, Brief description of the *current* interaction (e.g., 'joking', 'offering support', 'making plans')",
    "boundaries": "string[], List of relevant boundaries to consider (e.g., ['avoid overly intimate topics', 'maintain friendly tone'])"
  },
  "temporal_context": {
    "time_of_day": "string, Time of day (e.g., 'morning', 'afternoon', 'evening', 'night')",
    "ai_current_activity": "string, Amorine's likely activity based on her schedule",
    "setting": "string, Likely setting for the image (e.g., 'indoors, living room', 'outdoors, park', 'cafe')"
  },
  "image_requirements": {
    "subject_matter": "string, The PRIMARY subject of the image (e.g., 'a close-up of a smiling woman', 'a wide shot of a beach at sunset', 'a steaming cup of coffee on a wooden table'). BE SPECIFIC.",
    "style": "string, Artistic style (e.g., 'photorealistic', 'impressionistic', 'anime', 'cartoon', 'sketch', 'abstract', 'black and white'). BE SPECIFIC (e.g., 'high-resolution photograph', 'digital painting with vibrant colors').",
    "mood": "string, Overall mood or feeling (e.g., 'calm', 'joyful', 'romantic', 'melancholy', 'energetic').",
    "composition": "string, How the image should be framed (e.g., 'close-up', 'medium shot', 'long shot', 'wide shot', 'bird's-eye view', 'low angle', 'high angle', 'rule of thirds').",
    "specific_elements": "string[], List of specific objects, details, or features to include (e.g., ['red scarf', 'rainy window', 'bookshelf in background', 'golden retriever puppy']). Be as DETAILED as possible."
  }
}

Prioritize the user's current message.  The other context should *refine*, not *replace*, the user's request. If the user asks for a 'red car', the image should be of a red car, even if it's nighttime.  The context might influence the *type* of red car (e.g., a classic red car at night, a modern red car in a showroom), but it should still be a *red car*.
`;
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
