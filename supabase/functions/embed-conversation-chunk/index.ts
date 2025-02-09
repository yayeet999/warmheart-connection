
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
        dimensions: 384
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    if (!data.data?.[0]?.embedding) {
      throw new Error('Invalid embedding response structure');
    }

    console.log('Successfully generated embedding vector');
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
    
    const parsedMessages = recentMessagesRaw.map(msg => {
      try {
        if (typeof msg === 'object' && msg !== null) {
          if ('type' in msg && 'content' in msg) {
            return msg;
          }
          console.error('Invalid message object structure:', msg);
          return null;
        }
        
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
            indexName: 'amorine-vector',
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
