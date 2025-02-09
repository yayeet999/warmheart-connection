
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

async function generateEmbeddings(text: string): Promise<number[]> {
  const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL');
  const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN');

  if (!upstashVectorRestUrl || !upstashVectorRestToken) {
    throw new Error('Upstash Vector configuration missing');
  }

  const response = await fetch(`${upstashVectorRestUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${upstashVectorRestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'all-MiniLM-L6-v2',  // Updated model name to match exactly
      texts: [text],
    }),
  });

  if (!response.ok) {
    throw new Error(`Embeddings API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.embeddings?.[0]) {
    throw new Error('Invalid embeddings response');
  }

  return data.embeddings[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();
    
    if (!userId || typeof message !== 'string') {
      throw new Error('Invalid request parameters');
    }

    // Check message count threshold
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/message_counts?user_id=eq.${userId}&select=message_count`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      }
    );

    if (!countResponse.ok) {
      throw new Error('Failed to fetch message count');
    }

    const [countData] = await countResponse.json();
    
    // Skip vector search if message count is below threshold
    if (!countData || countData.message_count < 47) {
      return new Response(
        JSON.stringify({ 
          skip: true, 
          reason: 'Message count below threshold'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent messages from Redis
    const key = `user:${userId}:messages`;
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
      .reverse();

    const recentContents = parsedMessages.map((m: any) => m.content);
    const messagesToEmbed = [...recentContents, message];

    // Generate and average embeddings
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

    // Query Upstash Vector
    const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL')!;
    const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')!;

    const searchResponse = await fetch(`${upstashVectorRestUrl}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashVectorRestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexName: 'amorine-vector',  // Added index name
        vector: queryVector,
        topK: 2,
        includeMetadata: true,
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

    // Update profile with retrieved memory chunks
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
