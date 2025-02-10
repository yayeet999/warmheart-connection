
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// For embedding with OpenAI
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
        // Example model name and config
        model: "text-embedding-3-small",
        input: text,
        dimensions: 384, 
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
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

    // ---------------------------------------------------------
    // 1) Check total message count from Redis (like chat-history)
    // ---------------------------------------------------------
    const key = `user:${userId}:messages`;
    const totalCount = await redis.llen(key);

    // Only run vector search if user has >= 47 messages
    if (totalCount < 47) {
      return new Response(
        JSON.stringify({ 
          skip: true, 
          reason: `Message count (${totalCount}) below threshold of 47.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------------------------------------------------------
    // 2) Fetch recent messages from Redis (last 5 or so)
    // ---------------------------------------------------------
    const recentMessagesRaw = await redis.lrange(key, 0, 4);

    const parsedMessages = recentMessagesRaw
      .map(msg => {
        try {
          return typeof msg === 'string' ? JSON.parse(msg) : msg;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // optional reverse so oldest -> newest in array

    const recentContents = parsedMessages.map((m: any) => m.content);
    // We'll embed these + the current user message
    const messagesToEmbed = [...recentContents, message];

    // ---------------------------------------------------------
    // 3) Generate embeddings & average them
    // ---------------------------------------------------------
    const embeddingsArray = await Promise.all(
      messagesToEmbed.map(txt => generateEmbeddings(txt))
    );

    const dim = embeddingsArray[0]?.length || 0;
    const sumVector = new Array(dim).fill(0);
    for (const emb of embeddingsArray) {
      for (let i = 0; i < dim; i++) {
        sumVector[i] += emb[i];
      }
    }
    const queryVector = sumVector.map(val => val / embeddingsArray.length);

    // ---------------------------------------------------------
    // 4) Query Upstash Vector with user-specific metadata filter
    // ---------------------------------------------------------
    const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL')!;
    const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')!;

    const searchResponse = await fetch(`${upstashVectorRestUrl}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashVectorRestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexName: 'amorine-vector',
        vector: queryVector,
        topK: 2,
        includeMetadata: true,
        filter: {
          field: "user_id",
          value: userId,
        },
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`Vector search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const memoryChunks = (searchData.result || [])
      .map((r: any) => r.metadata?.memory_chunk)
      .filter((c: any) => typeof c === 'string' && c.length > 0);

    const joinedMemoryChunks = memoryChunks.join('\n\n-----\n\n');

    // ---------------------------------------------------------
    // 5) Update user profile with the retrieved memory
    // ---------------------------------------------------------
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
      throw new Error('Failed to update profile with memory chunks');
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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
