import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

// Replace these if needed by your environment variables:
const llamaApiUrl = Deno.env.get("LLAMA_API_URL") || "https://api.groq.com/openai/v1/chat/completions";
const llamaApiKey = Deno.env.get("GROQ_API_KEY") || "";
const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
const elevenLabsVoiceId = "ejkFxMONy8VgED1lXil1"; // example voice ID from your environment

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getLatestAIMessage(userId: string): Promise<string | null> {
  try {
    const key = `user:${userId}:messages`;
    const messages = await redis.lrange(key, 0, 9); 
    if (!messages?.length) {
      console.error("No messages found for user:", userId);
      return null;
    }

    for (const msgStr of messages) {
      try {
        const parsed = typeof msgStr === "string" ? JSON.parse(msgStr) : msgStr;
        if (parsed.type === "ai" && parsed.metadata?.voice === true) {
          if (!parsed.content) {
            console.error("AI message with voice metadata but no content");
            continue;
          }
          return parsed.content;
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    }
    console.log("No AI message with voice===true found in recent messages");
    return null;
  } catch (error) {
    console.error("Redis error:", error);
    return null;
  }
}

async function transformTextForSpeech(originalText: string): Promise<string> {
  if (!llamaApiKey) {
    console.log("No llamaApiKey found, skipping text transform");
    return originalText;
  }
  const systemPrompt = `
You are a text transformer. Remove ASCII emoticons, replace slang like "lol", "omg", "lmao" with mild synonyms or remove them. Return final text only, nothing else.
`.trim();

  try {
    const resp = await fetch(llamaApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llamaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: originalText },
        ],
        temperature: 0.2,
        max_tokens: 60,
      }),
    });

    if (!resp.ok) {
      console.error("Llama transform error:", await resp.text());
      return originalText;
    }
    const data = await resp.json();
    const cleaned = data.choices?.[0]?.message?.content?.trim() || originalText;
    return cleaned;
  } catch (error) {
    console.error("transformTextForSpeech error:", error);
    return originalText;
  }
}

async function generateSpeechWithElevenLabs(text: string): Promise<Uint8Array> {
  if (!elevenLabsKey || !elevenLabsVoiceId) {
    throw new Error("Missing ElevenLabs API key or voice ID in env");
  }
  try {
    const requestBody = {
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.7,
        speed: 1.0,
      },
    };

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsKey,
        },
        body: JSON.stringify(requestBody),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", err);
      throw new Error(`ElevenLabs TTS error: ${err}`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No reader on ElevenLabs response");
    }
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalSize += value.length;
      }
    }
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  } catch (error) {
    console.error("generateSpeechWithElevenLabs error:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const { userId, text } = body;
    if (!userId) {
      throw new Error("Missing userId in request body");
    }

    console.log("voice_convert: userId =", userId);

    // if text is not provided, we try retrieving from Redis
    let finalText = text;
    if (!finalText) {
      console.log("No text provided in body; fetching from Redis metadata...");
      const redisText = await getLatestAIMessage(userId);
      if (!redisText) {
        throw new Error("Could not find a valid AI message with voice metadata");
      }
      finalText = redisText;
    }

    // Clean text with Llama
    const cleanedText = await transformTextForSpeech(finalText);
    console.log("Cleaned text length:", cleanedText.length);

    // Call ElevenLabs to generate audio
    const audioBinary = await generateSpeechWithElevenLabs(cleanedText);

    // Return raw audio as "audio/mpeg"
    return new Response(audioBinary, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("voice_convert error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
