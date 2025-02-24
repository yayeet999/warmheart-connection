import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { Index } from "npm:@upstash/vector";

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const vectorIndex = new Index({
  url: Deno.env.get('UPSTASH_VECTOR_REST_URL')!,
  token: Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateEmbeddings(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 384,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    if (!data.data?.[0]?.embedding) {
      throw new Error('Invalid embeddings response');
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();
    if (!userId || typeof message !== 'string') {
      throw new Error('Invalid request parameters: userId and message are required.');
    }

    console.log('Processing voice request for userId:', userId);

    const key = `user:${userId}:messages`;
    const totalCount = await redis.llen(key);

    if (totalCount < 47) {
      return new Response(
        JSON.stringify({ 
          skip: true, 
          reason: `Message count (${totalCount}) below threshold of 47.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating embedding for current voice message...');
    const queryVector = await generateEmbeddings(message);

    // Vector search with proper filtering
    const searchResults = await vectorIndex.query({
      vector: queryVector,
      topK: 2,
      includeMetadata: true,
      filter: `user_id = '${userId}'`,
    });

    console.log('Voice search response:', JSON.stringify(searchResults));

    const memoryChunks = searchResults
      .filter(r => r.metadata?.memory_chunk)
      .map(r => r.metadata.memory_chunk);

    if (memoryChunks.length === 0) {
      console.log('No voice memory chunks found');
      return new Response(
        JSON.stringify({ 
          success: true,
          retrievedMemoryCount: 0,
          retrievedMemoryChunks: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call voice-middle-thoughts function to process the memories
    console.log('Calling voice-middle-thoughts function to process memories...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const middleThoughtsResponse = await fetch(
      `${supabaseUrl}/functions/v1/voice-middle-thoughts`,
      {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('Authorization') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          memoryChunks,
        }),
      }
    );

    if (!middleThoughtsResponse.ok) {
      const error = await middleThoughtsResponse.text();
      throw new Error(`Voice-middle-thoughts function error: ${error}`);
    }

    const middleThoughtsResult = await middleThoughtsResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        retrievedMemoryCount: memoryChunks.length,
        retrievedMemoryChunks: memoryChunks,
        processedMemory: middleThoughtsResult.processedMemory
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice vector search error:', error);
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