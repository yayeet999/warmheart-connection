
// Follow this middleware pattern to enable CORS for browser requests
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function convertToVoice(text: string) {
  const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenlabsApiKey) {
    throw new Error('ElevenLabs API key not found');
  }

  const voiceId = "0TfZ4rvne3QI7UjDxVkM"; // Default voice ID

  console.log('Sending request to ElevenLabs API...');
  
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

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer).toString('base64');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();
    console.log('Processing voice chat request:', { userId, message });

    // Get AI response
    const messages = [{
      content: message,
      role: "system",
      name: "user"
    }];

    // Generate AI response text
    const aiResponse = "Here is my voice response!"; // Replace with actual AI generation
    console.log('Generated AI response:', aiResponse);

    // Convert AI response to voice
    console.log('Converting to voice...');
    const audioData = await convertToVoice(aiResponse);
    console.log('Voice conversion complete');

    return new Response(
      JSON.stringify({
        messages: [{
          content: aiResponse,
          audio: audioData
        }]
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
