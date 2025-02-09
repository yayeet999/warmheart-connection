import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to generate embeddings from Upstash Vector
async function generateEmbeddings(text: string): Promise<number[]> {
  const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL');
  const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN');

  if (!upstashVectorRestUrl || !upstashVectorRestToken) {
    throw new Error('Upstash Vector URL/token missing from env variables.');
  }

  const response = await fetch(`${upstashVectorRestUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${upstashVectorRestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'ALL_MINILM_L6_V2',
      texts: [text],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embeddings Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.embeddings || !Array.isArray(data.embeddings[0])) {
    throw new Error('Invalid embeddings response format.');
  }

  return data.embeddings[0] as number[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json() as { userId?: string };
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Embedding chunk for user: ${userId}`);

    // 1) Fetch last 8 messages from Redis (the queue was LIFO so index 0..7)
    const key = `user:${userId}:messages`;
    const recentMessagesRaw = await redis.lrange(key, 0, 7);
    const parsedMessages = recentMessagesRaw
      .map((msg) => {
        try {
          return typeof msg === 'string' ? JSON.parse(msg) : msg;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (parsedMessages.length < 8) {
      console.log(`Not enough messages for user ${userId}: found ${parsedMessages.length} < 8`);
      return new Response(
        JSON.stringify({ success: false, reason: 'Fewer than 8 messages found.' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Reverse them so oldest is first in the joined text
    parsedMessages.reverse();

    // 2) Build the chunk text
    const conversationChunkText = parsedMessages
      .map((m: any) => `${m.type.toUpperCase()}: ${m.content}`)
      .join('\n');

    // 3) Generate embeddings
    const embeddingVector = await generateEmbeddings(conversationChunkText);

    // 4) Store in Upstash Vector
    const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL')!;
    const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')!;
    const chunkId = `${userId}-${Date.now()}`;
    const indexName = 'amorine-vector'; // your chosen index name

    const storeResponse = await fetch(`${upstashVectorRestUrl}/vectors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashVectorRestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexName,
        vectors: [
          {
            id: chunkId,
            values: embeddingVector,
            metadata: {
              userId,
              memory_chunk: conversationChunkText,
              created_at: new Date().toISOString(),
            },
          },
        ],
      }),
    });

    if (!storeResponse.ok) {
      const err = await storeResponse.text();
      throw new Error(`Upstash Vector insertion error: ${storeResponse.status} - ${err}`);
    }

    console.log(`Successfully stored vector for user ${userId}, chunk ID = ${chunkId}`);
    return new Response(
      JSON.stringify({
        success: true,
        chunkId,
        indexName,
        message: 'Successfully embedded & stored the last 8-message chunk.',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error('Error in embed-conversation-chunk function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
