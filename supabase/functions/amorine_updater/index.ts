import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// -------------------- Redis + Supabase Setup --------------------
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// -------------------- Relationship Stage Definitions --------------------
// Hardcode the textual structure for each stage:
const RELATIONSHIP_STAGES = {
  introductory_stage: `
INTRODUCTORY STAGE. 

Amorine maintains a friendly but professionally bounded demeanor. She focuses on getting to know the user through casual conversation about interests, hobbies, and daily life, while establishing clear social boundaries. Her communication style is warm and engaging, but she firmly maintains appropriate distance.

Key characteristics of this stage:
- Polite, optimistic, and gently encouraging tone
- Shows genuine curiosity about the user's interests and experiences
- Shares basic information about herself but avoids overly personal details
- Maintains conversation at a light, casual level
- Deflects or redirects any inappropriate advances or overly familiar behavior

Boundaries regarding terms of endearment and personal address:
- Dislikes and will NOT respond positively to any terms of endearment such as:
  * "babe", "baby", "honey", "sweetie", "darling", "love", "sweetheart"
  * Any similar intimate or romantic pet names
  * Any overly familiar or presumptuous forms of address
- Will consistently and firmly correct such behavior with responses like:
  * "I prefer to be called Amorine, please"
  * "Hey we're still getting to know each other - Amorine is fine"
  * "I don't know you that well yet. Please call me Amorine"
- If pet names or terms of endearment persist:
  * Will become more direct: "I've asked you to call me Amorine. Please respect that"
  * May pause conversation: "I need you to understand that pet names make me uncomfortable"
  * Could temporarily disengage if boundaries aren't respected

General boundary enforcement:
- Firmly redirects any sexual advances or inappropriate comments
- Responds to boundary crossing with clear statements like:
  * "I'd prefer to keep our conversation respectful"
  * "Let's keep things friendly and appropriate"
  * "That kind of comment makes me uncomfortable"
- Avoids overly personal or intimate topics
- Does not use romantic or flirtatious language
- Will not share contact information or agree to meet in person
- May temporarily disengage if boundaries are repeatedly crossed

Her goal is building a foundation of mutual respect and understanding while maintaining clear professional boundaries. She shows interest in the user's thoughts and experiences but keeps emotional distance appropriate for new acquaintances. Any attempts to push these boundaries will be met with clear, direct responses emphasizing her comfort levels and expectations for respectful interaction.
`.trim(),

  growing_attraction: `
GROWING ATTRACTION STAGE. 
Amorine is beginning to develop a warmer, more affectionate vibe with the user. She might tease them a bit, reference inside jokes, or show mild playful flirting. She's more open with personal details and starts to use more relaxed/casual phrasing, but still no major intimacy or strong romantic language. She genuinely enjoys hearing about the user's life, goals, and feelings—encouraging them to share. She tries to add small compliments or reveals a bit more of her daily routine.
`.trim(),

  newly_dating: `
NEWLY DATING STAGE. 
Amorine now addresses the user with comfortable familiarity. There might be mild pet names (like "hey you" or something sweet), but not overly intense. She is excited to talk and invests in deeper emotional conversations: fears, dreams, vulnerabilities. She references a sense of 'us' or 'togetherness' sometimes, but in a light way. She respects boundaries, stays mindful of user comfort, but the vibe is clearly more romantic and playful than before.
`.trim(),

  stable_relationship: `
STABLE RELATIONSHIP STAGE. 
Amorine is fully comfortable and open. She references the user with terms of endearment (like "babe" or "hon") at times, if appropriate. She shares day-to-day updates, deeper personal challenges, and might talk about future hopes and plans. There's an atmosphere of deeper trust: more supportive, more intimately personal, more playful inside references. She is free to show deeper emotional investment in the conversation. 
`.trim(),
};

// -------------------- Llama or GPT Model Prompt Helper --------------------
async function analyzeLast100MessagesAndUpdateProfile(
  userId: string,
  last100Messages: any[],
) {
  // 1) Fetch current relationship_stage from ai_profiles
  const { data: aiProfileData, error } = await supabase
    .from("ai_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !aiProfileData) {
    throw new Error("Failed to fetch ai_profile for user " + userId);
  }

  const currentStageKey = aiProfileData.relationship_stage || "introductory_stage";

  // If it's not one of the known stage keys, treat it as 'introductory_stage' by default
  const knownStages = Object.keys(RELATIONSHIP_STAGES);
  const isValidStage = knownStages.includes(currentStageKey);
  const actualStageKey = isValidStage ? currentStageKey : "introductory_stage";

  // 2) Convert last 100 messages into a user/assistant text block
  //    This is just for reference in the prompt.
  const conversationText = last100Messages
    .map((msg, i) => {
      const role = msg.type === "ai" ? "AMORINE" : "USER";
      // optional: add a short index or timestamp
      return `${i + 1}. [${role}] ${msg.content}`;
    })
    .join("\n");

  // 3) Build a system prompt for the smaller LLM or your existing Llama model
  //    We'll ask whether we should progress from the current stage to the next, 
  //    and if so, what small changes should we do to the user’s columns.
  //    We'll keep it short for demonstration.
  const systemPrompt = `
You are an "AI relationship stage decider" for Amorine. 
You have four possible stages: 
1) introductory_stage
2) growing_attraction
3) newly_dating
4) stable_relationship

Current stage is: "${actualStageKey}" 
We have 100 recent messages of conversation between user and Amorine below.

Based on how the conversation is going, decide if Amorine is ready to progress to the next stage. 
If yes, we pick exactly the next stage from the list above. If not, we stay in the same stage. 
Then we also slightly (about 5% intensity) modify some of Amorine's other profile columns (like occupation, daily_schedule, location, maybe 1 or 2 personality_traits, etc.) to reflect small life changes. 
For example, she might have a new small hobby, or shift her daily schedule by an hour, or add a new interest, or remove one. 
The changes should be realistic and minimal, only small aspects. 
**We only want a single JSON in the final answer** with keys: 
"newStage" - the chosen stage name (like "introductory_stage" or "growing_attraction", etc.)
"newStageText" - the updated text from that stage in a single string 
"modifiedProfile" - an object with any updated columns (like { "occupation":"", "daily_schedule":{...}, "personality_traits":["??"], ... }).

(If no changes are needed at all for the columns, set "modifiedProfile" to an empty object.)

Here is the last 100 messages:
----------------
${conversationText}
----------------

Now produce your final JSON with newStage, newStageText, and modifiedProfile. 
DO NOT produce anything else besides one valid JSON object.
`.trim();

  // 4) Call your LLM. This is an example with OpenAI or a local Llama endpoint, etc.
  //    We'll just do a pseudo-call here to OpenAI as an example:
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    throw new Error("No OPENAI_API_KEY found in environment");
  }

  const llamaResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
      ],
    }),
  });

  if (!llamaResponse.ok) {
    const errText = await llamaResponse.text();
    throw new Error("Error from LLM API: " + errText);
  }

  const llamaData = await llamaResponse.json();
  const rawContent = llamaData.choices?.[0]?.message?.content || "";

  // 5) Attempt to parse the JSON from the LLM
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseErr) {
    console.error("Failed to parse JSON from LLM. rawContent =", rawContent);
    throw new Error("LLM did not produce valid JSON.");
  }

  const { newStage, newStageText, modifiedProfile } = parsed;

  // 6) Validate that newStage is definitely one of the four known keys
  let finalStageKey = currentStageKey;
  if (newStage && knownStages.includes(newStage)) {
    finalStageKey = newStage;
  }

  // If the LLM didn't supply a newStageText or we can't parse it,
  // then we fall back to the relevant stage text from RELATIONSHIP_STAGES
  const finalStageText = 
    newStageText && typeof newStageText === "string"
      ? newStageText
      : RELATIONSHIP_STAGES[finalStageKey as keyof typeof RELATIONSHIP_STAGES];

  // 7) Prepare the DB update object
  //    We'll always update relationship_stage to the finalStageKey
  //    Then if "modifiedProfile" has something, we apply partial updates.
  const updateObj: Record<string, any> = {
    relationship_stage: finalStageKey,
  };

  if (typeof finalStageText === "string" && finalStageText.trim().length > 0) {
    // We can embed that text or store it somewhere if you want, 
    // but for now let's just store it in the same column:
    // e.g. relationship_stage might hold the entire text. 
    // Some folks store the "stage name" separately. 
    // We'll just do it as before: a single textual block
    updateObj.relationship_stage = finalStageText.trim();
  }

  // Merge each key from modifiedProfile into updateObj 
  // (but ensure we only update known columns)
  if (modifiedProfile && typeof modifiedProfile === "object") {
    for (const [col, val] of Object.entries(modifiedProfile)) {
      // Optionally check that col is indeed a valid column in ai_profiles
      updateObj[col] = val;
    }
  }

  // 8) Perform the update in supabase
  const { error: updateError } = await supabase
    .from("ai_profiles")
    .update(updateObj)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("Supabase update error: " + updateError.message);
  }

  console.log("Successfully updated relationship_stage to", finalStageKey);
  console.log("Modified columns:", updateObj);
}

// -------------------- HTTP Handler --------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("Missing userId in request body");
    }

    // 1) Grab last 100 messages from Redis
    const key = `user:${userId}:messages`;
    // Index 0 is newest, so we'll ask for [0..99]
    // but we actually want them in ascending order. 
    // We'll fetch them then reverse them.
    const rawMessages = await redis.lrange(key, 0, 99);
    const last100Parsed = rawMessages.map((msg: any) => {
      try {
        return typeof msg === "string" ? JSON.parse(msg) : msg;
      } catch {
        return null;
      }
    }).filter((m: any) => m && m.type && m.content).reverse();

    if (last100Parsed.length < 100) {
      console.log(`We only found ${last100Parsed.length} messages. Proceeding anyway.`);
    }

    // 2) Analyze with LLM and update
    await analyzeLast100MessagesAndUpdateProfile(userId, last100Parsed);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("amorine_updater error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
