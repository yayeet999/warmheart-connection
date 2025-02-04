
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkSummary {
  id: string;
  summary_text: string;
  relationship_stage: string;
  key_events: any[];
  emotional_patterns: Record<string, any>;
  personality_insights: Record<string, any>;
  created_at: string;
}

const SYSTEM_PROMPT = `You are an advanced "Super Summarizer" AI. You will receive multiple chunk summaries spanning a weekly period. Each chunk summary has these fields:

{
  "summary_text": "...",
  "relationship_stage": "...",
  "key_events": [...],
  "emotional_patterns": {...},
  "personality_insights": {...}
}

### OBJECTIVE 1: MERGE & SYNTHESIZE
1. Combine all the chunk summaries for this weekly period into a single cohesive account, capturing key themes, repeated patterns, and new developments that emerged across the week.
2. Highlight Chronological Nuances: Present your weekly summary in a loose chronological flow, referencing each chunk's approximate day or created_at data column when relevant.
3. Capture Major Data Points & Nuances: 
   - Distill each chunk's critical insights, emotional shifts, user behaviors, or conversation style changes.
   - Notice subtle differences or conflicts between chunks.
   - Avoid merely stringing the chunks together—your goal is an integrated analysis.

### OBJECTIVE 2: RELATIONSHIP STAGE WEIGHTING
1. Gather the weekly chunk relationship_stages (each is exactly one from this 20-stage dictionary):
   [
     "initial_curiosity","casual_acquaintance","growing_interest","friendly_closeness","comfort_zone",
     "honeymoon_excitement","deepening_trust","exclusive_focus","emotional_intimacy","conflict",
     "conflict_resolution","renewed_bond","long_term_comfort","stagnation","drifting_apart",
     "attempted_repair","chronic_conflict","pre_breakup_tension","separation","reconciliation"
   ]
2. Calculate frequency of stages and select ONE final stage.
3. Acknowledge runner-up stages in summary_text with rationale.
4. Final relationship_stage must be ONE from the dictionary.

### RETURN FORMAT
Return exactly one valid JSON object with these keys:
{
  "summary_text": "...",
  "relationship_stage": "...",
  "key_events": [...],
  "emotional_patterns": {
    "primary_emotions": [],
    "triggers": {},
    "response_patterns": {},
    "growth_areas": [],
    "coping_mechanisms": {}
  },
  "personality_insights": {
    "communication_style": {
      "pattern": "",
      "examples": []
    },
    "values": [],
    "interests": [],
    "attachment_style": "",
    "decision_making": {
      "style": "",
      "patterns": []
    },
    "social_preferences": {},
    "growth_mindset": {}
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all distinct user_ids from non-super summaries in the past week
    const { data: userIds, error: userError } = await supabase
      .from('longtermmemory')
      .select('user_id')
      .eq('is_super_summary', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .distinct();

    if (userError) {
      throw new Error(`Error fetching users: ${userError.message}`);
    }

    console.log(`Found ${userIds?.length || 0} users with chunks to process`);

    // Process each user's chunks
    for (const { user_id } of userIds || []) {
      try {
        await processUserChunks(supabase, user_id, openAIApiKey);
      } catch (error) {
        console.error(`Error processing chunks for user ${user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Weekly super summarization completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in weekly-super-summarizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processUserChunks(supabase: any, userId: string, openAIApiKey: string, retryCount = 0): Promise<void> {
  const MAX_RETRIES = 3;
  
  try {
    // Get chunks to process
    const { data: chunks, error: chunksError } = await supabase
      .from('longtermmemory')
      .select('*')
      .eq('user_id', userId)
      .eq('is_super_summary', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (chunksError) throw chunksError;
    if (!chunks || chunks.length === 0) {
      console.log(`No chunks found for user ${userId}`);
      return;
    }

    console.log(`Processing ${chunks.length} chunks for user ${userId}`);

    // Call OpenAI API to generate super summary
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: SYSTEM_PROMPT 
          },
          { 
            role: 'user', 
            content: `Here are the chunks to analyze: ${JSON.stringify(chunks)}` 
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const gptResponse = await response.json();
    const superSummary = JSON.parse(gptResponse.choices[0].message.content);

    // Insert the super summary
    const { error: insertError } = await supabase
      .from('longtermmemory')
      .insert([{
        user_id: userId,
        is_super_summary: true,
        summary_text: superSummary.summary_text,
        relationship_stage: superSummary.relationship_stage,
        key_events: superSummary.key_events,
        emotional_patterns: superSummary.emotional_patterns,
        personality_insights: superSummary.personality_insights
      }]);

    if (insertError) throw insertError;

    // Delete the processed chunks
    const { error: deleteError } = await supabase
      .from('longtermmemory')
      .delete()
      .eq('user_id', userId)
      .eq('is_super_summary', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (deleteError) throw deleteError;

    console.log(`Successfully processed chunks for user ${userId}`);

  } catch (error) {
    console.error(`Error processing chunks for user ${userId}:`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying for user ${userId}, attempt ${retryCount + 1}`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return processUserChunks(supabase, userId, openAIApiKey, retryCount + 1);
    }
    
    throw error;
  }
}
