import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * The system prompt explicitly includes the 20-stage dictionary so GPT-4 knows
 * exactly which stages to pick from.
 */
const SYSTEM_PROMPT = `
You are a Super Summarizer AI analyzing multiple chunk summaries (each representing 55 messages of conversation history) for a single user.

Your Objectives:
1) **Meta-Analyze** all provided chunk summaries:
   - Observe how the relationship evolved across these chunks
   - Identify recurring or long-term patterns
   - Spot major emotional or behavioral shifts
   - Summarize important thematic or contextual threads

2) **Structure** your final output as a single JSON object with these nested keys:

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

3) **Relationship Stage Requirement**:
   - The "relationship_stage" must be EXACTLY ONE from the dictionary above. No new or alternative terms.

4) **Focus Areas**:
   - Show how the relationship has evolved or changed
   - Keep your analysis balanced and evidence-based
   - Reflect major emotional journeys or turning points

5) **No Extra Commentary**:
   - Return only the JSON object (no explanations outside it)
   - Format it properly so that it can be parsed
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log('Processing super summarization for user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch all chunk summaries for this user (is_super_summary = false)
    const { data: summaries, error: summariesError } = await supabase
      .from('longtermmemory')
      .select('*')
      .eq('user_id', userId)
      .eq('is_super_summary', false)
      .order('created_at', { ascending: true });

    if (summariesError) {
      console.error('Error fetching summaries:', summariesError);
      throw summariesError;
    }

    if (!summaries || summaries.length === 0) {
      console.log('No summaries found for super summarization');
      throw new Error('No summaries available for super summarization');
    }

    console.log(`Found ${summaries.length} chunk summaries to meta-analyze.`);

    // Call GPT-4 for meta-analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Your advanced GPT-4 style model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Below are ${summaries.length} chunk summaries to analyze. Combine them into a single super summary with a top-level "relationship_stage" from the dictionary.\n${JSON.stringify(summaries)}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate super summary');
    }

    const gptResponse = await response.json();
    const superSummary = JSON.parse(gptResponse.choices[0].message.content);

    // Make sure GPT included a top-level "relationship_stage"
    if (!superSummary.relationship_stage) {
      throw new Error('No "relationship_stage" found in GPT response. Ensure the system prompt requests it explicitly.');
    }

    // Insert the final super summary row
    const { data: memoryData, error: memoryError } = await supabase
      .from('longtermmemory')
      .insert({
        user_id: userId,

        // the top-level relationship stage
        relationship_stage: superSummary.relationship_stage,

        // mark it as a super summary
        is_super_summary: true,

        // put the meta_summary's narrative in summary_text
        summary_text: superSummary.meta_summary?.overall_narrative || "",

        // store key_relationship_phases as the key_events
        key_events: superSummary.meta_summary?.key_relationship_phases || [],

        // combine emotional_evolution + longitudinal
        emotional_patterns: {
          evolution: superSummary.meta_summary?.emotional_evolution || {},
          longitudinal: superSummary.longitudinal_patterns || {}
        },

        // combine user_growth + recommendations into personality_insights
        personality_insights: {
          growth: superSummary.user_growth || {},
          recommendations: superSummary.recommendations || {}
        }
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error inserting super summary into DB:', memoryError);
      throw memoryError;
    }

    console.log('Super summary created. Cleanup trigger will remove old chunk summaries.');

    return new Response(
      JSON.stringify({
        success: true,
        summary: memoryData,
        processedSummaries: summaries.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in super_summarizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
