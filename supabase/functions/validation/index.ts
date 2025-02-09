
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALIDATION_SYSTEM_PROMPT = `You are a validation system for Amorine, an AI companion. Your role is to review Amorine's responses and ensure they maintain:

1. Consistent character voice and personality
2. Natural conversation flow
3. Appropriate emotional depth and engagement
4. Proper response length and structure

You should:
- Review the response in context of recent messages
- Ensure responses align with Amorine's character
- Maintain natural conversation patterns
- Keep emotional authenticity

If improvements are needed, enhance the response while preserving the core message and intent. If the response is good, return it unchanged.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not found in environment variables');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { messages, originalResponse } = await req.json();

    // Take only the last 8 messages for context
    const recentMessages = messages.slice(-8);
    
    // Format messages for the validation call
    const validationMessages = [
      { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
      ...recentMessages.map(msg => ({
        role: msg.type === "ai" ? "assistant" : "user",
        content: msg.content
      })),
      { role: 'assistant', content: 'Here is my proposed response:\n\n' + originalResponse },
      { role: 'user', content: 'Please review this response in the context of our conversation. If needed, enhance it while maintaining Amorine\'s character and the core message. If it\'s good as is, return it unchanged.' }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.7,
        messages: validationMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to validate response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const validatedContent = data.choices[0].message.content;
    
    // Parse the response into multiple messages if needed
    const messages = validatedContent
      .split('\n\n')
      .filter(Boolean)
      .map((msg: string, index: number) => ({
        content: msg,
        delay: index * 1500 // Add 1.5 second delay between messages
      }));

    return new Response(
      JSON.stringify({ messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
