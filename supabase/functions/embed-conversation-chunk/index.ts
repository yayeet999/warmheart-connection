
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

  console.log('Generating embeddings for text:', text);

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

    const responseText = await response.text();
    console.log('Raw embedding response:', responseText);

    if (!response.ok) {
      throw new Error(`Embedding API Error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    if (!data.embeddings?.[0]) {
      throw new Error('Invalid embeddings response structure');
    }

    console.log('Successfully generated embedding vector');
    return data.embeddings[0];
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
    console.log('Received request:', req.method);
    const { userId } = await req.json();
    console.log('Processing request for userId:', userId);

    if (!userId || typeof userId !== 'string') {
      return Response.json(
        { error: 'Invalid or missing userId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const key = `user:${userId}:messages`;
    console.log('Fetching messages from Redis key:', key);
    const recentMessagesRaw = await redis.lrange(key, 0, 7);
    console.log('Raw messages from Redis:', recentMessagesRaw);
    
    // Improved parsing logic that handles both string and object formats
    const parsedMessages = recentMessagesRaw.map(msg => {
      try {
        // If it's already an object, just validate it
        if (typeof msg === 'object' && msg !== null) {
          if ('type' in msg && 'content' in msg) {
            return msg;
          }
          console.error('Invalid message object structure:', msg);
          return null;
        }
        
        // If it's a string, try to parse it
        if (typeof msg === 'string') {
          const parsed = JSON.parse(msg);
          if (parsed && typeof parsed === 'object' && 'type' in parsed && 'content' in parsed) {
            return parsed;
          }
          console.error('Invalid parsed message structure:', parsed);
          return null;
        }

        console.error('Invalid message type:', typeof msg);
        return null;
      } catch (e) {
        console.error('Failed to parse message:', msg, e);
        return null;
      }
    }).filter((msg): msg is { type: string; content: string } => 
      msg !== null && typeof msg.type === 'string' && typeof msg.content === 'string'
    );

    console.log('Successfully parsed messages:', parsedMessages);

    if (parsedMessages.length < 8) {
      console.log('Insufficient message history:', parsedMessages.length);
      return Response.json(
        { success: false, reason: 'Insufficient message history' },
        { headers: corsHeaders, status: 200 }
      );
    }

    const conversationChunk = parsedMessages
      .reverse()
      .map(m => `${m.type.toUpperCase()}: ${m.content}`)
      .join('\n');

    console.log('Generated conversation chunk:', conversationChunk);

    const embeddingVector = await generateEmbeddings(conversationChunk);
    console.log('Generated embedding vector length:', embeddingVector.length);
    
    const vectorId = `user_${userId}_${Date.now()}`;
    console.log('Storing vector with ID:', vectorId);

    try {
      const storeResponse = await fetch(
        `${Deno.env.get('UPSTASH_VECTOR_REST_URL')}/upsert`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('UPSTASH_VECTOR_REST_TOKEN')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: vectorId,
            vector: embeddingVector,
            metadata: {
              user_id: userId,
              memory_chunk: conversationChunk,
              created_at: new Date().toISOString(),
            }
          }),
        }
      );

      const storeResponseText = await storeResponse.text();
      console.log('Vector storage response:', storeResponseText);

      if (!storeResponse.ok) {
        throw new Error(`Vector storage failed: ${storeResponseText}`);
      }

      console.log('Successfully stored vector');
      return Response.json(
        {
          success: true,
          vector_id: vectorId,
          message: 'Conversation chunk processed and stored successfully'
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('Vector storage error:', error);
      throw error;
    }

  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
