
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateSpeechWithElevenLabs(text: string): Promise<string> {
  const CHUNK_SIZE = 5000;  // Safe chunk size for text
  const API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  const VOICE_ID = Deno.env.get('ELEVENLABS_DEFAULT_VOICEID') || 'EXAVITQu4vr4xnSDxMaL'; // Default to "Sarah" voice

  // Safety check for text length
  if (text.length > CHUNK_SIZE) {
    console.log(`Large text detected (${text.length} chars), truncating to ${CHUNK_SIZE} chars`);
    text = text.substring(0, CHUNK_SIZE);
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get the audio data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to prevent stack overflow
    const chunks: string[] = [];
    const chunkSize = 32768; // Safe chunk size for base64 conversion
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, [...chunk]));
    }

    // Join chunks and convert to base64
    const base64Audio = btoa(chunks.join(''));
    return base64Audio;

  } catch (error) {
    console.error('Error in generateSpeechWithElevenLabs:', error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log(`Processing text-to-speech request: ${text.substring(0, 100)}...`);
    
    const audioBase64 = await generateSpeechWithElevenLabs(text);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: { audioBase64 }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('voice_convert error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
