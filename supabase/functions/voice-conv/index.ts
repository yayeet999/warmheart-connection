// @deno-types="https://deno.land/x/xhr@0.1.0/mod.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.39.3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// TypeScript ignore - Deno global declaration
// @ts-ignore
const env = Deno?.env?.get;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'Content-Type, Content-Length'
};

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Standard base64 encoding
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders
    });
  }

  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid request parameters: text is required');
    }

    // @ts-ignore - Deno env is defined at runtime
    const elevenlabsApiKey = env('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    const voiceId = "21m00Tcm4TlvDq8ikWAM";

    console.log('Converting text to speech:', {
      textLength: text.length,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    // Get the audio data
    const audioData = await response.arrayBuffer();
    
    // Convert to base64
    const base64Audio = arrayBufferToBase64(audioData);

    console.log('Successfully generated voice audio');

    // Return base64 encoded audio
    return new Response(
      JSON.stringify(base64Audio),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Voice conversion error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 
