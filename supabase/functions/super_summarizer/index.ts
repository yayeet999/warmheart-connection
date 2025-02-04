
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

const SYSTEM_PROMPT = `You are a Super Summarizer AI analyzing multiple summaries of conversations between a user and their AI companion. You will receive all previous summaries that each represent 55 messages of conversation history.

Your task:

1) **Meta-Analyze** these summaries to identify:
   - Long-term patterns in user behavior and communication
   - Evolution of the relationship over time
   - Major recurring themes and topics
   - Significant changes or turning points
   - Overall emotional journey and growth

2) **Output** a JSON object with these structured keys:
   {
     "meta_summary": {
       "overall_narrative": "",              // High-level story of the relationship's progression
       "key_relationship_phases": [],        // Array of major phases/transitions observed
       "dominant_themes": [],               // Most significant recurring topics/patterns
       "emotional_evolution": {             // How emotions and interactions changed over time
         "pattern": "",
         "significant_shifts": [],
         "growth_indicators": []
       },
       "relationship_trajectory": {         // Overall direction and health of the relationship
         "current_state": "",
         "trends": [],
         "potential_areas_of_focus": []
       }
     },
     
     "user_growth": {
       "behavioral_changes": [],           // How user's behavior/communication evolved
       "insight_development": [],          // Major realizations or understanding gained
       "coping_strategies": {             // How user has learned to handle challenges
         "developed": [],
         "effective": [],
         "needs_work": []
       },
       "relationship_skills": {           // How user's relationship approach evolved
         "improvements": [],
         "consistent_strengths": [],
         "growth_opportunities": []
       }
     },
     
     "longitudinal_patterns": {
       "communication": [],               // Long-term communication patterns
       "emotional_regulation": [],        // How user manages emotions over time
       "attachment_style": {             // User's attachment patterns
         "primary_style": "",
         "variations": [],
         "triggers": []
       },
       "conflict_handling": [],          // How user approaches and resolves conflicts
       "trust_building": []             // How trust developed over time
     },
     
     "recommendations": {
       "focus_areas": [],               // Suggested areas for growth
       "maintenance_strategies": [],     // What's working and should continue
       "potential_challenges": [],       // Areas to watch out for
       "growth_opportunities": []       // Specific ways to improve
     }
   }

3) **Guidelines**:
   - Focus on significant patterns and changes over time
   - Identify both improvements and persistent challenges
   - Note any cyclical behaviors or recurring patterns
   - Highlight major breakthroughs or setbacks
   - Consider the overall trajectory of growth and development

Return only the valid JSON object. No additional commentary or role statements. Ensure all JSON is properly formatted and nested.`;

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

    // Get ALL chunk summaries from the database
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

    console.log(`Found ${summaries.length} summaries to process`);

    // Call GPT-4 for meta-analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Here are the ${summaries.length} summaries to analyze:\n${JSON.stringify(summaries)}`
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

    // Store the super summary in the database
    const { data: memoryData, error: memoryError } = await supabase
      .from('longtermmemory')
      .insert({
        user_id: userId,
        summary_text: superSummary.meta_summary.overall_narrative,
        key_events: superSummary.meta_summary.key_relationship_phases,
        emotional_patterns: {
          evolution: superSummary.meta_summary.emotional_evolution,
          longitudinal: superSummary.longitudinal_patterns
        },
        personality_insights: {
          growth: superSummary.user_growth,
          recommendations: superSummary.recommendations
        },
        is_super_summary: true
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error storing super summary:', memoryError);
      throw memoryError;
    }

    console.log('Successfully created super summary and triggered cleanup');

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
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

