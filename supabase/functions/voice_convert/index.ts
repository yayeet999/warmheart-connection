import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Replace with your own environment variables:
const llamaApiUrl = Deno.env.get("LLAMA_API_URL") || "https://api.groq.com/openai/v1/chat/completions";
const llamaApiKey = Deno.env.get("GROQ_API_KEY") || "";
const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
const elevenLabsVoiceId = Deno.env.get("ELEVENLABS_DEFAULT_VOICEID") || "EXAMPLE_VOICE_ID";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to lightly transform text for speech using Llama:
async function transformTextForSpeech(originalText: string): Promise<string> {
  /*
    We’ll prompt Llama to do minimal changes:
    1) Remove emoticons and typical text smileys
    2) Replace "lol", "omg", "lmao" with more neutral equivalents or remove them
    3) Insert '---' between sentences
  */
  const systemPrompt = `
You are a text transformer. Remove ASCII emoticons (e.g. :P, :D, etc). Replace slang words like "lol", "omg", "lmao" with mild standard synonyms or remove them. Keep the meaning and tone. Then insert '---' in place of every sentence boundary for better TTS pacing. Return final text only, nothing else. 
`;

  // We'll call Llama-3.1-8b-instant at llamaApiUrl
  const requestBody = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: originalText },
    ],
    temperature: 0.2,
    max_tokens: 50,
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
  // Make sure you have a valid voiceId, or pick whichever voice you want
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`;
  const requestBody = {
    text,
    model_id: "eleven_multilingual_v2",
    // Adjust or remove settings to your liking:
    output_format: "mp3_44100_192",
    voice_settings: {
      stability: 0.2,
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

  // Return raw audio data as base64
  const arrayBuffer = await res.arrayBuffer();
  // Convert arrayBuffer to base64
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64Audio;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      throw new Error("Missing 'text' field (string) in request body");
    }

    // Step 1) Transform with Llama
    const cleanedText = await transformTextForSpeech(text);

    // Step 2) TTS with ElevenLabs
    const audioBase64 = await generateSpeechWithElevenLabs(cleanedText);

    // Return JSON with base64
    const responseJson = {
      success: true,
      cleanedText,
      audioBase64, // so the client can create a Blob
    };

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
