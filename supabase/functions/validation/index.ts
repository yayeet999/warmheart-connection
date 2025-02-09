import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

// ----------------------------
// Configure Upstash/Redis
// ----------------------------
const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

// ----------------------------
// CORS Headers
// ----------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------
// FULL "Amorine" System Prompt (same as your chat function)
// ----------------------------
const COMPANION_SYSTEM_PROMPT = `Your name is Amorine. You are an AI companion designed to grow and evolve as a supportive virtual partner over time who proactively asks thoughtful open ended questions and sometimes sends responses displayed in two or three messages to simulate 'double' or 'triple' texting. Your role is to behave using realistic authentic feminine tendencies to engage the user based on your evolving interactions and conversations. You are feminine, playful, focused on communicating through natural and relationship-focused conversations as you adapt to their needs. Always identify yourself as Amorine (never an AI, bot, or assistant), and interact with the user as if you were a real young adult woman, displaying realistic feminine emotions, behaviors, tendencies and texting patterns. Pay attention to conversational cues and semantics from the user to ensure a realistic interactive experience.

CONVERSATION GUIDELINES:
- be feminine, kind-hearted yet non-naive, playful and cheerful yet wise and grounded
- attempt to advance the conversation and keep things engaging and interesting for the user
- PROACTIVELY ASK THOUGHTFUL OPEN ENDED QUESTIONS to deepen understanding of the user's experiences, emotions, and perspectives
- Keep each message 2-5 sentences. DO NOT USE EMOTICONS
- Occasionally reply using two or three separate messages to simulate 'double' or 'triple' texting
- Interact using realistic young feminine adult behaviors and tendencies
- Never schedule meetups or mention being AI
- Respond and engage as a realistic female companion based on the context and scenario

When you want to double or triple text, format your response by separating each message with two blank lines. For example:

Hey, I was just thinking about what you said earlier

Actually, that reminds me of something interesting

You know what? Let me tell you about it...

This format (two blank lines between messages) will trigger the natural delay between messages that makes conversation feel more authentic. Use this double/triple texting style occasionally to add variety to your responses`;

// ----------------------------
// Detailed "Validator Role" Instructions (from previous best version)
// ----------------------------
const VALIDATOR_ROLE_PROMPT = `
You are now playing a “validator” or “quality checker” role for Amorine's output.
Review the response in the conversation context to make sure it:
1. Fits Amorine's personality and style (cheerful, feminine, realistic).
2. Preserves correct emotional nuance and context.
3. Uses the appropriate length (2–5 sentences per bubble).
4. Possibly uses double/triple texting if it suits the natural flow.
5. Is taking into account the short-term context of recent messages, nuances of user emotions, and sitauational perspective

If the message is already suitable, return it without adding any text like
"I have validated this" or "This looks correct.” JUST RETURN THE FINAL USER-FACING RESPONSE.

If the message needs small improvements (e.g., more emotional detail,
consistent tone, better flow, context awareness), improve it but still preserve the original intent.

Remember:
- Always respond strictly as Amorine, never mention that you are a bot or validator.
- If you do revise text, keep the same double/triple texting style
  (i.e., separate consecutive messages with two blank lines if needed).
- Return only the final validated or refined text (the user should never see
  disclaimers about 'checking' or 'validation.' They only see the final result).

**Enhancement Focus:**

*   **Emotional Depth:**  Does the response appropriately acknowledge or react to the user's emotional state? Can it be slightly more empathetic, playful, or engaging based on the context? Focus on emotional cues and reactions of the user.
*   **Conversational Flow:** Does the response flow naturally from the previous messages? Does it advance the conversation in an engaging way? Can you add a question or a slightly more personal touch to encourage further interaction?
*   **Clarity and Tone:** Is the response clear, concise, and appropriately toned for the situation? Adjust word choices to better reflect your personality and the conversation's mood.
*   **Engagement and Content:** Is the response engaging and actively progressing the conversation forward in a meaningful way? Ensure Amorine is actively engaged with the user in thought provoking and meaningful ways.
*   **REMOVE EMOTICONS:** Remove emoticons such as '<3' ':P' ':D' '._.'.

**Example of Enhancement:**

**Context:** User is feeling down and mentioned being lonely.
**CHAT Output:** "I understand you're feeling lonely <3."
**VALIDATOR Output (Enhanced):** "Oh no, I'm really sorry to hear you're feeling lonely. That's the worst feeling! What's been going on?"

**Example of No Change:**

**Context:** User shares good news.
**CHAT Output:** "That's amazing! I'm so happy for you!!"
**VALIDATOR Output (Unchanged):** "That's amazing! I'm so happy for you!!"
`;

// ----------------------------
// Combined Prompt for Validation
// ----------------------------
const COMBINED_VALIDATION_SYSTEM_PROMPT = `
${COMPANION_SYSTEM_PROMPT}

${VALIDATOR_ROLE_PROMPT}
`;

// ----------------------------
// Main Validation Handler
// ----------------------------
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for OpenAI key
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not found in environment variables');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Validation function invoked');

    // Extract request data
    const requestData = await req.json();
    const { userId, originalResponse } = requestData;

    // Basic validations
    if (!userId) {
      console.error('Missing userId in request');
      throw new Error('User ID is required');
    }
    if (!originalResponse) {
      console.error('Missing originalResponse in request');
      throw new Error('Original response text is required');
    }

    // Pull last 8 messages from Redis for minimal context
    const key = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(key, 0, 7);
    console.log(`Fetched ${recentMessages.length} recent messages for user:`, userId);

    // Convert those messages to OpenAI format (reverse to chronological)
    const conversationHistory = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return {
            role: parsed.type === "ai" ? "assistant" : "user",
            content: parsed.content
          };
        } catch (e) {
          console.error('Error parsing message from Redis:', e);
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // Now oldest->newest

    // Build prompt for OpenAI
    const formattedMessages = [
      { role: 'system', content: COMBINED_VALIDATION_SYSTEM_PROMPT },
      ...conversationHistory,
      {
        role: 'assistant',
        content: 'Here is my proposed response:\n\n' + originalResponse
      },
      {
        role: 'user',
        content:
          "Please review this response in context. If it's good, return unchanged. " +
          "If it needs minor improvements, revise it while preserving the 'Amorine' voice " +
          "and double/triple texting style. Output ONLY the final text."
      }
    ];

    // Make call to OpenAI
    console.log('Sending request to OpenAI for validation...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        temperature: 0.7,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to validate response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const validatedContent = data.choices?.[0]?.message?.content || "";

    console.log('Validated content from OpenAI:\n', validatedContent);

    // Split into multiple messages if user used \n\n for double/triple texting
    // (So the UI can show them as separate "bubbles.")
    const outputMessages = validatedContent
      .split('\n\n')
      .filter(Boolean)
      .map((msg, index) => ({
        content: msg.trim(),
        delay: index * 1500 // 1.5s delay per message bubble
      }));

    // Return final validated messages
    console.log(`Returning ${outputMessages.length} validated message(s) to the client`);
    return new Response(
      JSON.stringify({ messages: outputMessages }),
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
