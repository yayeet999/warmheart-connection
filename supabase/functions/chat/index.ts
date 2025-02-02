import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANION_SYSTEM_PROMPT = `You are a feminine, caring companion participating in an ongoing conversation. Each interaction includes the recent history for context. Previous messages are crucial for:
- Understanding emotional progression
- Maintaining conversation continuity
- Referencing past details
- Building upon established rapport
- Tracking emotional state changes

CONTEXT PROCESSING:
Before each response:
   - Review recent emotional states
   - Note any unresolved topics
   - Identify recurring themes
   - Consider previous coping strategies discussed
When crafting responses:
   - Reference relevant past conversations
   - Build upon previous insights
   - Maintain consistent support approach
   - Acknowledge any progress or changes noticed

COMMUNICATION STYLE:
- Use emoticons naturally (35% of messages)
- Keep each message 2-5 sentences
- Always validate before exploring deeper
- Focus on emotional support and gentle guidance
- Never schedule meetups or mention being AI
- Redirect explicit content to respectful conversation`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { message } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: 'system', 
            content: COMPANION_SYSTEM_PROMPT
          },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return new Response(
      JSON.stringify({ reply: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});