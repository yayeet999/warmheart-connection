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

    console.log('Processing request for userId:', userId);

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

    const recentMessagesRaw = await redis.lrange(key, 0, 4);
    console.log('Recent messages retrieved:', recentMessagesRaw.length);

    const parsedMessages = recentMessagesRaw
      .map(msg => {
        try {
          return typeof msg === 'string' ? JSON.parse(msg) : msg;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    const recentContents = parsedMessages.map((m: any) => m.content);
    const messagesToEmbed = [...recentContents, message];

    console.log('Generating embeddings for messages...');
    const embeddingsArray = await Promise.all(
      messagesToEmbed.map(txt => generateEmbeddings(txt))
    );

    // Calculate average vector
    const dim = embeddingsArray[0]?.length || 0;
    const sumVector = new Array(dim).fill(0);
    for (const emb of embeddingsArray) {
      for (let i = 0; i < dim; i++) {
        sumVector[i] += emb[i];
      }
    }
    const queryVector = sumVector.map(val => val / embeddingsArray.length);

    // Vector search with proper filtering
    const searchResults = await vectorIndex.query({
      vector: queryVector,
      topK: 2,
      includeMetadata: true,
      filter: `user_id = '${userId}'`, // Correct filter syntax
    });

    console.log('Search response:', JSON.stringify(searchResults));

    const memoryChunks = searchResults
      .filter(r => r.metadata?.memory_chunk)
      .map(r => r.metadata.memory_chunk);

    const joinedMemoryChunks = memoryChunks.join('\n\n-----\n\n');

    // Supabase update
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          vector_long_term: joinedMemoryChunks,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Supabase update failed: ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        retrievedMemoryCount: memoryChunks.length,
        retrievedMemoryChunks: memoryChunks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Vector search error:', error);
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
