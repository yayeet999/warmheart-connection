import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * System prompt includes the 20-stage dictionary in the JSON skeleton,
 * ensuring GPT-4 knows exactly which single stage to pick.
 */
const SYSTEM_PROMPT = `
You are a Super Summarizer AI analyzing multiple chunk summaries (each representing 55 messages) for a single user.

Your Objectives:
1) **Meta-Analyze** all provided chunk summaries:
   - Observe how the relationship evolved across these chunks
   - Identify recurring or long-term patterns
   - Spot major emotional or behavioral shifts
   - Summarize important thematic or contextual threads

2) **Return** a single JSON object with these top-level fields:

{
  "relationship_stage": "...",  // EXACTLY ONE from this dictionary:
  // [
  //   "initial_curiosity","casual_acquaintance","growing_interest","friendly_closeness","comfort_zone",
  //   "honeymoon_excitement","deepening_trust","exclusive_focus","emotional_intimacy","conflict",
  //   "conflict_resolution","renewed_bond","long_term_comfort","stagnation","drifting_apart",
  //   "attempted_repair","chronic_conflict","pre_breakup_tension","separation","reconciliation"
  // ],

  "meta_summary": {
    "overall_narrative": "",
    "key_relationship_phases": [],
    "dominant_themes": [],
    "emotional_evolution": {
      "pattern": "",
      "significant_shifts": [],
      "growth_indicators": []
    },
    "relationship_trajectory": {
      "current_state": "",
      "trends": [],
      "potential_areas_of_focus": []
    }
  },

  "user_growth": {
    "behavioral_changes": [],
    "insight_development": [],
    "coping_strategies": {
      "developed": [],
      "effective": [],
      "needs_work": []
    },
    "relationship_skills": {
      "improvements": [],
      "consistent_strengths": [],
      "growth_opportunities": []
    }
  },

  "longitudinal_patterns": {
    "communication": [],
    "emotional_regulation": [],
    "attachment_style": {
      "primary_style": "",
      "variations": [],
      "triggers": []
    },
    "conflict_handling": [],
    "trust_building": []
  },

  "recommendations": {
    "focus_areas": [],
    "maintenance_strategies": [],
    "potential_challenges": [],
    "growth_opportunities": []
  }
}

3) **Relationship Stage**:
   - Must be EXACTLY ONE from the 20-stage dictionary above.

4) **Focus** on:
   - Summarizing important relationship & emotional patterns across all chunk summaries
   - Providing an integrated, multi-chunk perspective.

5) **No Extra Commentary**:
   - Return only the valid JSON. No additional text or "role" statements.
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log("Processing super summarization for user:", userId);

    if (!userId) {
      throw new Error("User ID is required");
    }

    // 1. Fetch all chunk summaries for this user (is_super_summary = false).
    const { data: summaries, error: summariesError } = await supabase
      .from("longtermmemory")
      .select("*")
      .eq("user_id", userId)
      .eq("is_super_summary", false)
      .order("created_at", { ascending: true });

    if (summariesError) {
      console.error("Error fetching chunk summaries:", summariesError);
      throw summariesError;
    }

    if (!summaries || summaries.length === 0) {
      console.log("No chunk summaries found, cannot create super summary.");
      throw new Error("No chunk summaries available for super summarization");
    }

    console.log(`Found ${summaries.length} chunk summaries to meta-analyze.`);

    // 2. Call GPT-4 (or advanced GPT model) for meta-analysis
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o", // or your advanced GPT-4 model
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Below are ${summaries.length} chunk summaries to analyze. Combine them into a single super summary with a top-level "relationship_stage" from the dictionary.\n${JSON.stringify(summaries)}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error("Failed to generate super summary");
    }

    const gptResponse = await response.json();

    // 3. Parse GPT's JSON content.
    let superSummary;
    try {
      superSummary = JSON.parse(gptResponse.choices[0].message.content);
    } catch (err) {
      throw new Error("GPT response was not valid JSON.");
    }

    if (!superSummary.relationship_stage) {
      throw new Error('Missing "relationship_stage" in GPT response. Must be one of the 20-stage dictionary items.');
    }

    // 4. Insert the newly created super summary into the longtermmemory table.
    const { data: memoryData, error: memoryError } = await supabase
      .from("longtermmemory")
      .insert({
        user_id: userId,
        // Mark as super summary
        is_super_summary: true,

        // The top-level relationship stage from the GPT output
        relationship_stage: superSummary.relationship_stage,

        // We'll store the big narrative in summary_text
        summary_text: superSummary?.meta_summary?.overall_narrative || "",

        // We'll interpret "key_relationship_phases" as key_events
        key_events: superSummary?.meta_summary?.key_relationship_phases || [],

        // Combine emotional_evolution + longitudinal
        emotional_patterns: {
          evolution: superSummary?.meta_summary?.emotional_evolution || {},
          longitudinal: superSummary?.longitudinal_patterns || {},
        },

        // Combine user_growth + recommendations
        personality_insights: {
          growth: superSummary?.user_growth || {},
          recommendations: superSummary?.recommendations || {},
        },
      })
      .select()
      .single();

    if (memoryError) {
      console.error("Error inserting super summary:", memoryError);
      throw memoryError;
    }

    console.log("Successfully inserted super summary row. Cleanup will remove old chunks.");

    // 5. Trigger a separate Edge Function to update user_profile_analysis:
    //    We'll pass the newly created super summary row in the request body
    //    so the separate function can parse & upsert the user's profile.
    try {
      const { error: updateProfileError } = await supabase.functions.invoke("update-user-profile-analysis", {
        body: {
          userId,
          superSummary: memoryData, // or pass only the relevant fields
        },
      });
      if (updateProfileError) {
        console.error("Error invoking update-user-profile-analysis:", updateProfileError);
      }
    } catch (invokeErr) {
      console.error("Failed to invoke the update-user-profile-analysis function:", invokeErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: memoryData,
        processedSummaries: summaries.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in super_summarizer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
