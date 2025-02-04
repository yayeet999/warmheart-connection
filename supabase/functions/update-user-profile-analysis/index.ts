import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Predefined enumerations / sets for textual columns
 * used in user_profile_analysis. Adjust as needed.
 */
const communicationStyleOptions = [
  "direct",
  "indirect",
  "supportive",
  "logical",
  "reserved",
  "enthusiastic",
  "unknown",
];
const copingStyleOptions = [
  "avoidant",
  "talk_it_out",
  "confrontational",
  "ruminative",
  "proactive",
  "unknown",
];
const decisionMakingStyleOptions = [
  "impulsive",
  "analytical",
  "consensus_seeking",
  "intuitive",
  "unknown",
];
const attachmentStyleOptions = [
  "secure",
  "anxious",
  "avoidant",
  "fearful_avoidant",
  "unknown",
];

/**
 * System prompt for GPT. It includes instructions:
 * - Use "weighting" for more recent rows
 * - Hard-coded enumerations for each textual column
 * - Score ranges for numeric columns (0-100)
 */
const SYSTEM_PROMPT = `
You are a specialized "Profile Updater" AI. You will receive multiple "super summary" rows for a single user. Each row includes:

  - created_at: timestamp
  - summary_text (string)
  - relationship_stage (string)
  - key_events (array)
  - emotional_patterns (object)
  - personality_insights (object)
  - etc.

Your task:
1) Weigh more recent super summaries more heavily than older ones.
2) Based on all super summaries, determine the best current values for this user's "profile analysis" schema:

   - Numeric columns (all in [0..100]):
     * relationship_stage_score
     * trust_score
     * conflict_score
     * overall_emotional_health

   - Enumerations from these sets:
     * communication_style: ${communicationStyleOptions.join(", ")}
     * coping_style: ${copingStyleOptions.join(", ")}
     * decision_making_style: ${decisionMakingStyleOptions.join(", ")}
     * attachment_style: ${attachmentStyleOptions.join(", ")}

   - repeated_relationship_stages: JSON array of the distinct or repeated relationship_stage(s) you have observed
   - repeated_themes: JSON object capturing recurring big topics or emotional patterns
   - extended_personality: JSON object for additional nuanced traits

Output EXACTLY the following JSON structure (top-level only, no extra commentary):

{
  "relationship_stage_score": 0,
  "trust_score": 0,
  "conflict_score": 0,
  "overall_emotional_health": 0,
  "communication_style": "",
  "coping_style": "",
  "decision_making_style": "",
  "attachment_style": "",
  "repeated_relationship_stages": [],
  "repeated_themes": {},
  "extended_personality": {}
}

- All numeric values must be integers between 0 and 100.
- For textual columns, pick exactly from the enumerations above or "unknown".
- Use your best reasoning from the super summaries to decide final values.
- For repeated_relationship_stages or repeated_themes or extended_personality, compile your final aggregated insight.
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log("Updating user_profile_analysis for:", userId);
    if (!userId) {
      throw new Error("User ID is required");
    }

    // 1) Fetch up to the last 20 super summaries for this user, oldest first.
    //    This ensures we respect chronological order & only weigh the most recent 20.
    const { data: superSummaries, error: fetchError } = await supabase
      .from("longtermmemory")
      .select("*")
      .eq("user_id", userId)
      .eq("is_super_summary", true)
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error("Error fetching super summaries:", fetchError);
      throw fetchError;
    }
    if (!superSummaries || superSummaries.length === 0) {
      throw new Error("No super summaries found for this user.");
    }

    console.log("Found super summary rows:", superSummaries.length);

    // 2) Call GPT to synthesize + weigh recency
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o", // or your advanced GPT-4 class model
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User has ${superSummaries.length} super summary rows. Weight the most recent row(s) more. Summaries:\n${JSON.stringify(
              superSummaries
            )}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error("Failed to generate user profile analysis");
    }

    const gptResponse = await response.json();
    const analysisStr = gptResponse.choices[0].message.content.trim();

    // 3) Parse the AI's output
    let analysisObj;
    try {
      analysisObj = JSON.parse(analysisStr);
    } catch (parseErr) {
      console.error("Error parsing GPT JSON:", parseErr, analysisStr);
      throw new Error("Could not parse JSON from GPT response. Check formatting.");
    }

    // Validate numeric range + enumerations
    function clamp(num: number, min: number, max: number) {
      return Math.min(Math.max(num, min), max);
    }

    let {
      relationship_stage_score,
      trust_score,
      conflict_score,
      overall_emotional_health,
      communication_style,
      coping_style,
      decision_making_style,
      attachment_style,
      repeated_relationship_stages,
      repeated_themes,
      extended_personality,
    } = analysisObj;

    // Coerce numeric fields
    relationship_stage_score = clamp(
      parseInt(relationship_stage_score, 10) || 0,
      0,
      100
    );
    trust_score = clamp(parseInt(trust_score, 10) || 0, 0, 100);
    conflict_score = clamp(parseInt(conflict_score, 10) || 0, 0, 100);
    overall_emotional_health = clamp(
      parseInt(overall_emotional_health, 10) || 0,
      0,
      100
    );

    // Coerce enumerations
    const coerceEnum = (
      value: string,
      validSet: string[],
      defaultVal = "unknown"
    ) => (validSet.includes(value) ? value : defaultVal);

    communication_style = coerceEnum(
      communication_style,
      communicationStyleOptions
    );
    coping_style = coerceEnum(coping_style, copingStyleOptions);
    decision_making_style = coerceEnum(
      decision_making_style,
      decisionMakingStyleOptions
    );
    attachment_style = coerceEnum(attachment_style, attachmentStyleOptions);

    // Basic sanity fallback if arrays/objects not correct type
    if (!Array.isArray(repeated_relationship_stages)) {
      repeated_relationship_stages = [];
    }
    if (typeof repeated_themes !== "object" || repeated_themes === null) {
      repeated_themes = {};
    }
    if (typeof extended_personality !== "object" || extended_personality === null) {
      extended_personality = {};
    }

    // 4) Upsert into user_profile_analysis
    //    - If row exists for userId, update it
    //    - else insert new row
    const { data: existingRow, error: getRowError } = await supabase
      .from("user_profile_analysis")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (getRowError && getRowError.details?.includes("0 rows")) {
      // It's okay if no row found
      console.log("No existing row found for user, will create new profile analysis row.");
    } else if (getRowError) {
      console.error("Error checking existing row:", getRowError);
      throw getRowError;
    }

    const upsertPayload = {
      user_id: userId,
      relationship_stage_score,
      trust_score,
      conflict_score,
      overall_emotional_health,
      communication_style,
      coping_style,
      decision_making_style,
      attachment_style,
      repeated_relationship_stages,
      repeated_themes,
      extended_personality,
    };

    let upsertResult;
    if (!existingRow) {
      // Insert
      console.log("Inserting new user_profile_analysis row...");
      const { data: newRow, error: insertError } = await supabase
        .from("user_profile_analysis")
        .insert(upsertPayload)
        .select()
        .single();
      if (insertError) {
        console.error("Error inserting user_profile_analysis:", insertError);
        throw insertError;
      }
      upsertResult = newRow;
    } else {
      // Update
      console.log("Updating existing user_profile_analysis row...");
      const { data: updatedRow, error: updateError } = await supabase
        .from("user_profile_analysis")
        .update(upsertPayload)
        .eq("user_id", userId)
        .select()
        .single();
      if (updateError) {
        console.error("Error updating user_profile_analysis:", updateError);
        throw updateError;
      }
      upsertResult = updatedRow;
    }

    // 5) Return success
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        updatedProfile: upsertResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in update-user-profile-analysis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
