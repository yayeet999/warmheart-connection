
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateEmbeddings(text: string): Promise<number[]> {
  const upstashVectorRestUrl = Deno.env.get('UPSTASH_VECTOR_REST_URL');
  const upstashVectorRestToken = Deno.env.get('UPSTASH_VECTOR_REST_TOKEN');

  if (!upstashVectorRestUrl || !upstashVectorRestToken) {
    throw new Error('Missing Upstash Vector credentials in environment variables');
  }

  try {
    const response = await fetch(`${upstashVectorRestUrl}/embeddings/all-minilm-l6-v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashVectorRestToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Embedding API Error: ${errorBody.error || response.statusText}`);
    }

    const { embeddings } = await response.json();
    if (!embeddings?.[0]) {
      throw new Error('Invalid embeddings response structure');
    }

    return embeddings[0];
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Embedding service unavailable: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return Response.json(
        { error: 'Invalid or missing userId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const key = `user:${userId}:messages`;
    const recentMessagesRaw = await redis.lrange(key, 0, 7);
    
    const parsedMessages = recentMessagesRaw
      .filter(msg => typeof msg === 'string')
      .map(msg => {
        try {
          return JSON.parse(msg);
        } catch {
          return null;
        }
      })
      .filter(msg => msg?.content && msg?.type);

    if (parsedMessages.length < 8) {
      return Response.json(
        { success: false, reason: 'Insufficient message history' },
        { headers: corsHeaders, status: 200 }
      );
    }

    const conversationChunk = parsedMessages
      .reverse()
      .map(m => `${m.type.toUpperCase()}: ${m.content}`)
      .join('\n');

    const embeddingVector = await generateEmbeddings(conversationChunk);
    
    const storeResponse = await fetch(
      `${Deno.env.get('UPSTASH_VECTOR_REST_URL')}/upsert`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vectors: [{
            id: `user_${userId}_${Date.now()}`,
            vector: embeddingVector,
            metadata: {
              user_id: userId,
              memory_chunk: conversationChunk,
              created_at: new Date().toISOString(),
            }
          }]
        }),
      }
    );

    if (!storeResponse.ok) {
      const error = await storeResponse.json();
      throw new Error(`Vector storage failed: ${error.error}`);
    }

    return Response.json(
      {
        success: true,
        vector_id: `user_${userId}_${Date.now()}`,
        message: 'Conversation chunk processed and stored successfully'
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
