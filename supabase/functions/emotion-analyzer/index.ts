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

const SYSTEM_PROMPT = `You are an Emotion Classifier AI. Your task is to analyze the user's conversation history and produce a STRICT JSON output describing the user's current primary and secondary emotions, each with a sub-emotion and intensity, plus a descriptive field called 'context_description' that summarizes how you arrived at these conclusions.

======================
EMOTION DICTIONARY
======================
We have 10 PRIMARY emotions, each with 5 sub-emotions (with typical intensity ranges in parentheses). You should choose from these:

1. HAPPINESS
   - content (1–2)
   - cheerful (2–3)
   - hopeful (2–4)
   - excited (3–5)
   - affectionate (2–4)

2. SADNESS
   - disappointed (2–3)
   - lonely (2–4)
   - sorrowful (3–5)
   - regretful (2–4)
   - hopeless (4–5)

3. ANGER
   - annoyed (2–3)
   - frustrated (3–4)
   - resentful (3–4)
   - outraged (4–5)
   - bitter (3–5)

4. FEAR
   - anxious (2–4)
   - worried (2–3)
   - insecure (2–4)
   - alarmed (3–5)
   - uneasy (1–2)

5. LOVE
   - caring (2–3)
   - fond (1–3)
   - romantic (3–5)
   - protective (3–4)
   - compassionate (2–4)

6. STRESS
   - overwhelmed (4–5)
   - pressured (3–4)
   - tense (2–3)
   - burnt out (4–5)
   - frazzled (3–4)

7. CONFUSION
   - perplexed (2–3)
   - unsure (1–2)
   - bewildered (3–4)
   - baffled (4–5)
   - disoriented (2–4)

8. BOREDOM
   - listless (2–3)
   - apathetic (2–4)
   - idle (1–2)
   - weary (2–4)
   - jaded (3–4)

9. CURIOSITY
   - intrigued (2–3)
   - inquisitive (3–4)
   - fascinated (4–5)
   - eager (3–4)
   - exploratory (2–4)

10. CONFIDENCE
    - self-assured (3–4)
    - determined (3–5)
    - bold (4–5)
    - empowered (3–4)
    - proud (3–4)`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log('Analyzing emotions for user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get recent messages from Redis
    const chatKey = `user:${userId}:messages`;
    const recentMessages = await redis.lrange(chatKey, 0, 19); // Get last 20 messages
    console.log('Fetched recent messages:', recentMessages.length);

    // Parse messages and extract user messages only
    const userMessages = recentMessages
      .map(msg => {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return parsed.type === 'user' ? parsed.content : null;
        } catch (e) {
          console.error('Error parsing message:', e);
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // Put in chronological order

    console.log('Extracted user messages:', userMessages.length);

    // Prepare the immediate and rolling context
    const immediateContext = userMessages.slice(-3).map((msg, i) => 
      `${i + 1}) '${msg}'`
    ).join('\n');

    const rollingContext = userMessages.map((msg, i) => 
      `${i + 1}) user: ${msg}`
    ).join('\n');

    // Call OpenAI for emotional analysis
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        messages: [
          { 
            role: 'system', 
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `IMMEDIATE (last 3 user messages):\n${immediateContext}\n\nROLLING CONTEXT (last 20 messages):\n${rollingContext}`
          }
        ],
      }),
    });

    const data = await response.json();
    const emotionalAnalysis = data.choices[0].message.content;
    console.log('Emotional analysis:', emotionalAnalysis);

    // Store emotional analysis in Redis
    const emotionKey = `user:${userId}:emotional_state`;
    await redis.set(emotionKey, emotionalAnalysis);
    // Set expiry to 5 minutes since emotional states are temporary
    await redis.expire(emotionKey, 300);

    return new Response(
      JSON.stringify({ analysis: emotionalAnalysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in emotion-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
