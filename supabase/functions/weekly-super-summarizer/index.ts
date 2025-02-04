
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
        await processUserChunks(supabase, user_id);
      } catch (error) {
        console.error(`Error processing chunks for user ${user_id}:`, error);
        // Continue with next user even if one fails
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

async function processUserChunks(supabase: any, userId: string, retryCount = 0): Promise<void> {
  const MAX_RETRIES = 3;
  
  try {
    // Start a transaction
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

    // Process chunks through the super summarizer
    const superSummary = generateSuperSummary(chunks);

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
    
    // Implement retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying for user ${userId}, attempt ${retryCount + 1}`);
      // Wait for an exponentially increasing time before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return processUserChunks(supabase, userId, retryCount + 1);
    }
    
    throw error; // If max retries reached, throw the error
  }
}

function generateSuperSummary(chunks: ChunkSummary[]) {
  // Count relationship stages to determine the most common one
  const stageCount: Record<string, number> = {};
  chunks.forEach(chunk => {
    stageCount[chunk.relationship_stage] = (stageCount[chunk.relationship_stage] || 0) + 1;
  });

  // Find the most common stage
  let finalStage = Object.entries(stageCount)
    .sort(([,a], [,b]) => b - a)[0][0];

  // Prepare chronological narrative
  const chronologicalEvents = chunks.map(chunk => ({
    date: new Date(chunk.created_at),
    stage: chunk.relationship_stage,
    summary: chunk.summary_text,
    events: chunk.key_events
  })).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Merge emotional patterns and personality insights
  const mergedEmotionalPatterns = mergeEmotionalPatterns(chunks);
  const mergedPersonalityInsights = mergePersonalityInsights(chunks);

  // Create chronological summary text
  const summaryText = createChronologicalSummary(chronologicalEvents, stageCount, finalStage);

  // Merge and deduplicate key events
  const mergedKeyEvents = mergeKeyEvents(chunks);

  return {
    summary_text: summaryText,
    relationship_stage: finalStage,
    key_events: mergedKeyEvents,
    emotional_patterns: mergedEmotionalPatterns,
    personality_insights: mergedPersonalityInsights
  };
}

function mergeEmotionalPatterns(chunks: ChunkSummary[]) {
  // Implement merging logic for emotional patterns
  const merged = {
    primary_emotions: new Set<string>(),
    triggers: {} as Record<string, any>,
    response_patterns: {} as Record<string, any>,
    growth_areas: new Set<string>(),
    coping_mechanisms: {} as Record<string, any>
  };

  chunks.forEach(chunk => {
    const patterns = chunk.emotional_patterns;
    if (patterns.primary_emotions) {
      patterns.primary_emotions.forEach((emotion: string) => merged.primary_emotions.add(emotion));
    }
    Object.assign(merged.triggers, patterns.triggers);
    Object.assign(merged.response_patterns, patterns.response_patterns);
    if (patterns.growth_areas) {
      patterns.growth_areas.forEach((area: string) => merged.growth_areas.add(area));
    }
    Object.assign(merged.coping_mechanisms, patterns.coping_mechanisms);
  });

  return {
    primary_emotions: Array.from(merged.primary_emotions),
    triggers: merged.triggers,
    response_patterns: merged.response_patterns,
    growth_areas: Array.from(merged.growth_areas),
    coping_mechanisms: merged.coping_mechanisms
  };
}

function mergePersonalityInsights(chunks: ChunkSummary[]) {
  // Implement merging logic for personality insights
  const merged = {
    communication_style: {
      pattern: "",
      examples: new Set<string>()
    },
    values: new Set<string>(),
    interests: new Set<string>(),
    attachment_style: "",
    decision_making: {
      style: "",
      patterns: new Set<string>()
    },
    social_preferences: {} as Record<string, any>,
    growth_mindset: {} as Record<string, any>
  };

  chunks.forEach(chunk => {
    const insights = chunk.personality_insights;
    if (insights.communication_style?.examples) {
      insights.communication_style.examples.forEach((ex: string) => merged.communication_style.examples.add(ex));
    }
    if (insights.values) {
      insights.values.forEach((value: string) => merged.values.add(value));
    }
    if (insights.interests) {
      insights.interests.forEach((interest: string) => merged.interests.add(interest));
    }
    if (insights.decision_making?.patterns) {
      insights.decision_making.patterns.forEach((pattern: string) => merged.decision_making.patterns.add(pattern));
    }
    
    // Take the most recent non-empty values for singular fields
    if (insights.communication_style?.pattern) {
      merged.communication_style.pattern = insights.communication_style.pattern;
    }
    if (insights.attachment_style) {
      merged.attachment_style = insights.attachment_style;
    }
    if (insights.decision_making?.style) {
      merged.decision_making.style = insights.decision_making.style;
    }
    
    Object.assign(merged.social_preferences, insights.social_preferences);
    Object.assign(merged.growth_mindset, insights.growth_mindset);
  });

  return {
    communication_style: {
      pattern: merged.communication_style.pattern,
      examples: Array.from(merged.communication_style.examples)
    },
    values: Array.from(merged.values),
    interests: Array.from(merged.interests),
    attachment_style: merged.attachment_style,
    decision_making: {
      style: merged.decision_making.style,
      patterns: Array.from(merged.decision_making.patterns)
    },
    social_preferences: merged.social_preferences,
    growth_mindset: merged.growth_mindset
  };
}

function mergeKeyEvents(chunks: ChunkSummary[]) {
  // Implement merging logic for key events
  const uniqueEvents = new Map();
  
  chunks.forEach(chunk => {
    chunk.key_events.forEach(event => {
      const eventKey = JSON.stringify(event);
      if (!uniqueEvents.has(eventKey)) {
        uniqueEvents.set(eventKey, event);
      }
    });
  });

  return Array.from(uniqueEvents.values());
}

function createChronologicalSummary(
  chronologicalEvents: Array<{date: Date; stage: string; summary: string; events: any[]}>,
  stageCount: Record<string, number>,
  finalStage: string
) {
  // Create a chronological narrative
  const timeMarkers = chronologicalEvents.map((event, index) => {
    const day = event.date.toLocaleDateString('en-US', { weekday: 'long' });
    if (index === 0) return `Early in the week (${day})`;
    if (index === chronologicalEvents.length - 1) return `Later in the week (${day})`;
    return `Mid-week (${day})`;
  });

  // Sort stages by frequency for runner-up determination
  const sortedStages = Object.entries(stageCount)
    .sort(([,a], [,b]) => b - a)
    .map(([stage]) => stage);

  let summary = chronologicalEvents.map((event, i) => 
    `${timeMarkers[i]}: ${event.summary}`
  ).join(' ');

  // Add relationship stage explanation
  if (sortedStages.length > 1) {
    const runnerUps = sortedStages.slice(1, 3);
    summary += ` Throughout the week, while there were moments of ${runnerUps.join(' and ')}, the predominant relationship stage was "${finalStage}".`;
  } else {
    summary += ` The relationship consistently maintained a "${finalStage}" stage throughout the week.`;
  }

  return summary;
}
