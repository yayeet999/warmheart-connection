let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5; // Subscription limit
const requestQueue = [];

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  activeRequests++;
  const { resolve, reject, req } = requestQueue.shift();

  try {
    const response = await handleRequest(req);
    resolve(response);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    console.log('Request completed. Active requests:', activeRequests);
    processQueue(); // Process next request
  }
}

function enqueueRequest(req) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, req });
    console.log('Request added to queue. Queue length:', requestQueue.length);
    processQueue();
  });
}

async function handleRequest(req) {
  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    throw new Error('Invalid request parameters: text is required');
  }

  const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenlabsApiKey) {
    throw new Error('ElevenLabs API key not found');
  }

  const voiceId = "0TfZ4rvne3QI7UjDxVkM";

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
        model_id: "eleven_flash_v2_5",
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

  const audioData = await response.arrayBuffer();
  
  console.log('Audio generated successfully.');
  
  return new Response(arrayBufferToBase64(audioData), {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
}

serve((req) => enqueueRequest(req).catch((error) => {
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
}));
