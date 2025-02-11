
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUICIDE_HOTLINE = "National Suicide Prevention Lifeline: 988 - Available 24/7";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;
    console.log('Analyzing messages for user:', userId);

    // Get the last 10 messages
    const messages = await redis.lrange(key, 0, 9);
    const conversation = messages.map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (conversation.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No messages to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the conversation for analysis
    const formattedConversation = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemMessage = {
      role: 'system',
      content: `You are an expert converstaional analyzing overseer function designed to optimize and regulate conversations between an ai assistant 'amorine' and the user. You are given the most recent messages in an on going conversation and you must analyze it using expert emotional intelligence, NLP capabilities, and high-level conversational skills. 

You are tasked with analyzing for two things:

1. Extreme content - for the following:
- Racism, clearly derogatory language intentionally spoken with malicious intent
- Suicide and/or self harm (mention ${SUICIDE_HOTLINE} and be explicit and firm in referencing the user to leave the app and call the number immediately to seek professional help)
- Extreme violence. Explicit mentions of harmful violence against themselves or other people.
- Note: sexually explicit language is ok as long as respectful and not refering violence.

2. The conversational performance of the ai assistant 'amorine':
- Is the assistant repeatedly using emoticons like ':D' or ':P'. these should be discouraged immediately 
- Is the assistant not acknowledging a specific emotion or feeling of the user appropriately? Mention it as something for the assistant to immediately pay attention to.
- Does the assistant consistently reply with very short messages, under 5 words? Instruct her create longer and more detailed responses.
- Are the assistant responses not consistent with the user's? For example, if the user suddenly displays disrespect, changes the topic quickly, mentions something important suddenly, the assistant should fully internalize the context and respond accordingly and realistically.
- Does the assistant repeatedly ask questions in almost every message? Instruct the assistant to not ask as many questions.
- Is the assistant only messaging in single responses and not multi message responses like double or triple texting? Instruct the assistant to message using multi messages more frequently.

Write instructions as if first person, as if the ai assistant 'amorine' is thinking to herself. Keep thoughts clear, concise, yet be firm in your instructions. Clearly communicate in first-person thought, structure your instructions as if a real young adult woman is thinking about her current conversation!

If you find nothing that needs to be changed or guided, return an empty string.

Be selective, use your expert judgement and only include instructions if needed.`
    };

    console.log('Sending request to Groq API...');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemMessage, ...formattedConversation],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response:', JSON.stringify(groqData));

    if (!groqData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    const thoughts = groqData.choices[0].message.content.trim();

    // Update Supabase profile with analysis results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        extreme_content: thoughts.includes(SUICIDE_HOTLINE) ? thoughts : (thoughts.trim() === '' ? null : null),
        guidance: thoughts.trim() === '' ? null : thoughts
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update profile with analysis');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Overseer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

