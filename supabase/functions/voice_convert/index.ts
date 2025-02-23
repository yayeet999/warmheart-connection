import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

// Replace with your own environment variables:
const llamaApiUrl = Deno.env.get("LLAMA_API_URL") || "https://api.groq.com/openai/v1/chat/completions";
const llamaApiKey = Deno.env.get("GROQ_API_KEY") || "";
const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
const elevenLabsVoiceId = "ejkFxMONy8VgED1lXil1";  // Hardcoded voice ID

// Initialize Redis client
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to get latest AI message from Redis
async function getLatestAIMessage(userId: string): Promise<string | null> {
  try {
    const key = `user:${userId}:messages`;
    // Get the most recent messages to find one with voice metadata
    const messages = await redis.lrange(key, 0, 9);
    
    if (!messages?.length) {
      console.error("No messages found for user:", userId);
      return null;
    }

    console.log("Found messages in Redis:", messages.length);

    // Look for the most recent AI message with voice metadata
    for (const msgStr of messages) {
      try {
        console.log("Checking message:", msgStr);
        const parsed = typeof msgStr === 'string' ? JSON.parse(msgStr) : msgStr;
        console.log("Parsed message:", JSON.stringify(parsed));
        
        if (parsed.type === "ai" && parsed.metadata?.voice === true) {
          if (!parsed.content) {
            console.error("Found AI message with voice metadata but no content");
            continue;
          }
          console.log("Found valid AI message with voice metadata");
          return parsed.content;
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    }

    console.log("No AI message with voice metadata found in recent messages");
    return null;
  } catch (error) {
    console.error("Redis error:", error);
    return null;
  }
}

// Helper to lightly transform text for speech using Llama:
async function transformTextForSpeech(originalText: string): Promise<string> {
  /*
    We'll prompt Llama to do minimal changes:
    1) Remove emoticons and typical text smileys
    2) Replace "lol", "omg", "lmao" with mild standard synonyms or remove them
    3) We'll just do a general cleaning approach, returning the final text
  */
  const systemPrompt = `
You are a text transformer. Remove ASCII emoticons (e.g. :P, :D, etc). Replace slang words like "lol", "omg", "lmao" with mild standard synonyms or remove them. Return final text only, nothing else.
`;

  const requestBody = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: originalText },
    ],
    temperature: 0.2,
    max_tokens: 60,
  };

  const resp = await fetch(llamaApiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${llamaApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    console.error("Llama transform error:", await resp.text());
    throw new Error("Failed to transform text with Llama");
  }

  const data = await resp.json();
  const cleaned = data.choices?.[0]?.message?.content?.trim() || originalText;
  return cleaned;
}

// Helper to call ElevenLabs with the cleaned text:
async function generateSpeechWithElevenLabs(text: string) {
  console.log("Starting TTS with text length:", text.length);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`;
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": elevenLabsKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("ElevenLabs API error:", err);
    throw new Error(`ElevenLabs TTS error: ${err}`);
  }

  console.log("Got successful response from ElevenLabs");

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader from ElevenLabs TTS");
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      totalSize += value.length;
      console.log("Received chunk of size:", value.length);
    }
  }

  console.log("Total chunks:", chunks.length, "Total size:", totalSize);

  const combinedArray = new Uint8Array(totalSize);
  let position = 0;

  for (const chunk of chunks) {
    combinedArray.set(chunk, position);
    position += chunk.length;
  }

  console.log("Combined array size:", combinedArray.length);

  const encoded = encode(combinedArray);
  console.log("Final base64 length:", encoded.length);

  return encoded;
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Voice convert function called");
    
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));
    
    if (!body?.userId || typeof body.userId !== 'string') {
      throw new Error("Request must include 'userId' field as a string");
    }

    const { userId } = body;
    console.log("Processing request for userId:", userId);

    // 1) Find the latest AI message that has voice metadata
    const text = await getLatestAIMessage(userId);
    if (!text) {
      throw new Error("Could not find a valid AI message with voice metadata to convert. Please ensure the message exists and has voice metadata enabled.");
    }

    console.log("Found message to convert, length:", text.length);

    // 2) Clean/transform the text
    const cleanedText = await transformTextForSpeech(text);
    console.log("Cleaned text length:", cleanedText.length);

    // 3) TTS with ElevenLabs
    const audioBase64 = await generateSpeechWithElevenLabs(cleanedText);
    console.log("Audio base64 length:", audioBase64?.length || 0);

    const responseJson = {
      success: true,
      cleanedText,
      audioBase64,
    };

    console.log("Voice convert successful; returning data.");

    return new Response(JSON.stringify(responseJson), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
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
