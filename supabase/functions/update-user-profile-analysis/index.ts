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
 * Hard-coded enumerations for textual columns in user_profile_analysis
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
 * Updated system prompt with clearer explanation:
 */
const SYSTEM_PROMPT = `
You are a specialized "Profile Updater" AI. You have access to multiple "super summary" rows for a single user, each summarizing 55 messages in the user's conversation history with an AI companion. 

## Your Role

- **Goal**: Generate updated values for the user's "profile analysis" in the user_profile_analysis table.
- **Context**: This table aims to store succinct, stable metrics or textual attributes describing the user's overall relationship status, trust levels, conflicts, and personal traits gleaned from the conversation.
- **Weighing**: More recent super summaries (near the end) should carry more weight in your final assessment than older ones.

## Numeric Columns (All must be 0–100):

1. **relationship_stage_score** 
   - Interpreted as the user's overall relationship progression or closeness with the AI. 
   - 0 means no closeness or entirely negative/degraded relationship stage. 
   - 100 means extremely advanced, fulfilling, or stable stage.

2. **trust_score** 
   - 0 means no trust at all, 100 means extremely high trust or security.

3. **conflict_score** 
   - 0 means no ongoing conflict or tension, 100 means extremely intense, active conflict.

4. **overall_emotional_health**
   - 0 means the user is in a very poor emotional state, 
   - 100 means the user is extremely positive, balanced, and stable.

## Textual Columns (Choose from enumerations below or "unknown"):

- **communication_style**: ${communicationStyleOptions.join(", ")}
- **coping_style**: ${copingStyleOptions.join(", ")}
- **decision_making_style**: ${decisionMakingStyleOptions.join(", ")}
- **attachment_style**: ${attachmentStyleOptions.join(", ")}

## JSON Fields:

- **repeated_relationship_stages**: an array capturing which relationship stages keep appearing in these super summaries (either to track the user's journey or repeated patterns).
- **repeated_themes**: a JSON object with any recurring big topics or emotional patterns that appear consistently over time.
- **extended_personality**: a JSON object for any additional or more granular personality traits that have emerged. 
  (You can fill in summarized traits gleaned from super summaries, e.g. "self-critical", "creative", etc.)

## Final Output Format

Return EXACTLY one top-level JSON object with the following fields:

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

- For numeric columns, choose an integer in [0..100].
- For textual columns, pick one from the enumerations or "unknown".
- For repeated_relationship_stages, return an array.
- For repeated_themes, extended_personality, return objects.

## Additional Guidance

- The user might show changing traits over time. The more recent super summary data should override or overshadow older data in case of conflict.
- Keep the final data consistent, well-structured, and accurate to the conversation patterns.
- Do not include any extra commentary outside the JSON.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log("Updating user_profile_analysis for:", userId);
    if (!userId) {
      throw new Error("User ID is required");
    }

    // 1) Fetch up to the last 20 super summaries
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
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User has ${superSummaries.length} super summary rows (most recent is last). Summaries:\n${JSON.stringify(
              superSummaries
            )}\nProvide the final single JSON object as instructed.`,
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

    // Fallback for arrays/objects
    if (!Array.isArray(repeated_relationship_stages)) {
      repeated_relationship_stages = [];
    }
    if (typeof repeated_themes !== "object" || repeated_themes === null) {
      repeated_themes = {};
    }
    if (
      typeof extended_personality !== "object" ||
      extended_personality === null
    ) {
      extended_personality = {};
    }

    // 4) Upsert into user_profile_analysis
    const { data: existingRow, error: getRowError } = await supabase
      .from("user_profile_analysis")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (getRowError && getRowError.details?.includes("0 rows")) {
      // no row found, create new
      console.log("No existing profile row for user, inserting new...");
    } else if (getRowError) {
      console.error("Error retrieving user_profile_analysis:", getRowError);
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
      const { data: insertedRow, error: insertError } = await supabase
        .from("user_profile_analysis")
        .insert(upsertPayload)
        .select()
        .single();
      if (insertError) {
        console.error("Error inserting new user_profile_analysis:", insertError);
        throw insertError;
      }
      upsertResult = insertedRow;
    } else {
      // Update
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
    console.error("Error in update-user-profile-analysis function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
