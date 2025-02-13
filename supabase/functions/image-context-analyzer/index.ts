import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Initialize Redis client
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

interface AIProfile {
  daily_schedule: Record<string, string>;
  current_challenges: string[];
  relationship_stage: string;
  [key: string]: any; // For other profile fields
}

function getCurrentTimeSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function formatMessages(messages: Message[]): string {
  return messages
    .map((msg, index) => `${msg.type.toUpperCase()}: ${msg.content}`)
    .join("\n");
}

function buildAnalysisPrompt(
  currentMessage: string,
  recentMessages: Message[],
  aiProfile: AIProfile,
  timestamp: Date
): string {
  return `You are an image context analyzer. Analyze the following conversation and context to determine the most appropriate image response. Output ONLY valid JSON, no other text.

Current Relationship Stage:
${aiProfile.relationship_stage}

Recent Conversation (Last 15 messages):
${formatMessages(recentMessages)}

Current Time and AI State:
Time: ${timestamp.toLocaleTimeString()}
Time of Day: ${getCurrentTimeSlot()}
AI Schedule: ${aiProfile.daily_schedule[getCurrentTimeSlot()] || "No specific activity"}
Current Challenges: ${aiProfile.current_challenges?.join(", ") || "None"}

User's Current Message:
${currentMessage}

Analyze and provide a structured JSON response covering:
1. Emotional Context (AI emotion, user emotion, overall tone)
2. Relationship Dynamics (stage, current dynamics, boundaries)
3. Temporal/Setting Context (time of day, AI current activity, setting)
4. Specific Image Requirements (subject matter, style, mood, composition, specific elements)

Response must be ONLY valid JSON matching this structure:
{
  "emotional_context": {
    "ai_emotion": string,
    "user_emotion": string,
    "overall_tone": string
  },
  "relationship_context": {
    "stage": string,
    "current_dynamics": string,
    "boundaries": string[]
  },
  "temporal_context": {
    "time_of_day": string,
    "ai_current_activity": string,
    "setting": string
  },
  "image_requirements": {
    "subject_matter": string,
    "style": string,
    "mood": string,
    "composition": string,
    "specific_elements": string[]
  }
}`;
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
    const { data: aiProfile, error: profileError } = await supabase
      .from("ai_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch AI profile: ${profileError.message}`);
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
        .filter(Boolean)
        .reverse();
    } catch (e) {
      console.error("Error retrieving messages from Redis:", e);
      // Continue with empty messages rather than failing
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(
      message,
      recentMessages,
      aiProfile,
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
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a JSON-only output analyzer. Never include any text outside of the JSON structure.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
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
