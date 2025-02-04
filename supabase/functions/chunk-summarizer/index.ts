import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an advanced Summarizer AI. You will be given exactly 55 messages from a conversation between a user and their AI companion (consisting of paired user messages and AI responses). Your task:

1) **Analyze** these 55 messages chronologically, considering both sides of the conversation while focusing on user insights and patterns.

2) **Identify** major themes, events, emotional patterns, and personality insights, with particular attention to:
   - How the user communicates and responds
   - Recurring topics or concerns
   - Changes in emotional state or engagement
   - Key milestones or turning points
   - User's values and preferences

3) **Determine** the current relationship_stage from this fixed 20-stage dictionary:
   [
    'initial_curiosity','casual_acquaintance','growing_interest','friendly_closeness','comfort_zone',
    'honeymoon_excitement','deepening_trust','exclusive_focus','emotional_intimacy','conflict',
    'conflict_resolution','renewed_bond','long_term_comfort','stagnation','drifting_apart',
    'attempted_repair','chronic_conflict','pre_breakup_tension','separation','reconciliation'
   ]
   Select exactly ONE stage that best matches the current state. No variations or additional terms allowed.

4) **Output** a single JSON object with these structured keys:
   {
     "summary_text": "...",  // Concise (<500 tokens) yet comprehensive summary highlighting major aspects
     
     "relationship_stage": "...",  // ONE stage from the provided 20-stage dictionary
     
     "key_events": [{
       "event": "",          // Description of the significant event
       "impact": "",         // How this affected the relationship/user
       "type": ""           // "milestone"/"conflict"/"revelation"/"emotional_shift"/"shared_moment"
     }],
     
     "emotional_patterns": {
       "primary_emotions": [],           // Dominant emotional states observed
       "triggers": {},                   // What prompts emotional responses
       "response_patterns": {},          // How user typically reacts
       "growth_areas": [],              // Potential areas for emotional development
       "coping_mechanisms": {}          // How user handles difficult emotions
     },
     
     "personality_insights": {
       "communication_style": {          // How user expresses themselves
         "pattern": "",
         "examples": []
       },
       "values": [],                    // What user prioritizes/cares about
       "interests": [],                 // Topics user engages with most
       "attachment_style": "",          // How user builds connection
       "decision_making": {             // How user approaches choices
         "style": "",
         "patterns": []
       },
       "social_preferences": {},        // How user relates to others
       "growth_mindset": {}            // Attitude toward personal development
     }
   }

5) **Guidelines for Handling Unclear Data:**
   - Prioritize recent messages over earlier ones when patterns conflict
   - Mark insights as "tentative" if based on limited evidence
   - Focus on consistent patterns rather than one-off instances
   - Consider context when interpreting emotional responses
   - Look for growth or change in interaction patterns

Return only the valid JSON object. No additional commentary or role statements. Ensure all JSON is properly formatted and nested.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log('Processing chunk summarization for user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get the last 55 messages from Redis
    const key = `user:${userId}:messages`;
    const messages = await redis.lrange(key, 0, 54); // Get 55 messages (0-54)
    
    if (!messages || messages.length < 55) {
      console.log('Not enough messages for summarization:', messages?.length || 0);
      throw new Error('Need at least 55 messages for chunk summarization');
    }

    // Format messages for GPT
    const formattedMessages = messages.map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch (e) {
        console.error('Error parsing message:', e);
        return null;
      }
    }).filter(Boolean);

    // Call GPT-4 for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Here are the 55 messages to analyze:\n${JSON.stringify(formattedMessages.reverse())}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate summary');
    }

    const gptResponse = await response.json();
    const summary = JSON.parse(gptResponse.choices[0].message.content);

    // Store the summary in the database
    const { data: memoryData, error: memoryError } = await supabase
      .from('longtermmemory')
      .insert({
        user_id: userId,
        summary_text: summary.summary_text,
        relationship_stage: summary.relationship_stage,
        key_events: summary.key_events,
        emotional_patterns: summary.emotional_patterns,
        personality_insights: summary.personality_insights,
        is_super_summary: false
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error storing memory:', memoryError);
      throw memoryError;
    }

    // Reset the Redis chunk counter
    const counterKey = `user:${userId}:chunk_count`;
    await redis.set(counterKey, 0);
    console.log('Reset chunk counter to 0');

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: memoryData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in chunk-summarizer:', error);
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
