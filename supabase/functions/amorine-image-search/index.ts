import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Index } from "npm:@upstash/vector";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const vectorIndex = new Index({
  url: Deno.env.get('amorineIMAGE_UPSTASH_VECTOR_REST_URL')!,
  token: Deno.env.get('amorineIMAGE_UPSTASH_VECTOR_REST_TOKEN')!,
  namespace: "amorine-image"
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateEmbeddings(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not found');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
      dimensions: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  if (!data?.data?.[0]?.embedding) {
    throw new Error('Invalid embedding response from OpenAI');
  }
  return data.data[0].embedding;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ContextualScore {
  similarityScore: number;
  relationshipScore: number;
  timeScore: number;
  totalScore: number;
}

function calculateContextualScore(
  similarity: number,
  imageMetadata: any,
  analysis: any,
  timeContext: string
): ContextualScore {
  const SIMILARITY_WEIGHT = 0.7;
  const RELATIONSHIP_WEIGHT = 0.3;

  const relationshipScore = imageMetadata.relationship_stage === analysis.intimacy_metrics?.relationship_stage ? 1 : 0.5;

  let totalScore = (similarity * SIMILARITY_WEIGHT + relationshipScore * RELATIONSHIP_WEIGHT);

  let timeScore = 0;
  if (timeContext && imageMetadata.time_context) {
    timeScore = timeContext === imageMetadata.time_context ? 0.2 : 0;
    totalScore = totalScore * 0.8 + timeScore;
  }

  return {
    similarityScore: similarity,
    relationshipScore,
    timeScore,
    totalScore
  };
}

function buildSearchQuery(analysis: any, recentMessages: Message[] = [], currentMessage: string = ''): string {
  const parts: string[] = [];

  try {
    if (currentMessage) {
      parts.push(`INTENT: ${currentMessage}`);
    }

    const recentContext = recentMessages.slice(-5);
    if (recentContext.length) {
      const contextMessages = recentContext
        .map(msg => msg.content)
        .join(' ');
      parts.push(`CONTEXT: ${contextMessages}`);
    }

    if (analysis.intimacy_metrics?.relationship_stage) {
      parts.push(`RELATIONSHIP: ${analysis.intimacy_metrics.relationship_stage}`);
    }

    if (analysis.context?.temporal_setting) {
      parts.push(`TIME: ${analysis.context.temporal_setting}`);
    }

    if (analysis.intimacy_metrics?.flirt_level > 20) {
      parts.push(`FLIRT_LEVEL: ${analysis.intimacy_metrics.flirt_level}`);
    }

    if (analysis.visual_core?.image_type) {
      parts.push(`TYPE: ${analysis.visual_core.image_type}`);
    }

    if (analysis.emotional_essence?.intensity > 50) {
      parts.push(`EMOTION: ${analysis.emotional_essence.primary_emotion}`);
    }

  } catch (error) {
    console.error('Error building search query:', error);
    return currentMessage || 'general image';
  }

  return parts.filter(Boolean).join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis, userId, message_id, recentMessages, currentMessage } = await req.json();
    if (!analysis || !userId || !message_id) {
      throw new Error('analysis, userId, and message_id are required');
    }

    console.log('amorine-image-search request:', { userId, message_id });

    const searchQuery = buildSearchQuery(analysis, recentMessages, currentMessage);
    console.log('Built search query:', searchQuery);
    
    const queryVector = await generateEmbeddings(searchQuery);

    const timeContext = analysis.context?.temporal_setting || '';

    const usedSetKey = `used_images:${userId}`;
    const usedPaths = await redis.smembers(usedSetKey);
    const usedPathSet = new Set(usedPaths || []);

    const topKs = [5, 10, 20];
    let bestMatch = null;
    let bestScore = 0;

    for (const k of topKs) {
      console.log(`Searching vector index with topK=${k}...`);
      
      const searchResults = await vectorIndex.query({
        vector: queryVector,
        topK: k,
        includeMetadata: true,
        scoreThreshold: 0.7
      });

      if (!searchResults?.length) {
        console.log(`No results meeting threshold at topK=${k}`);
        continue;
      }

      const storagePaths = searchResults.map(r => r.id);
      const { data: images, error } = await supabase
        .from('image_library')
        .select('*')
        .in('storage_path', storagePaths)
        .eq('active', true);

      if (error) {
        console.error('Database query error:', error);
        throw new Error(error.message);
      }

      const availableImages = images
        .filter(img => !usedPathSet.has(img.storage_path))
        .map(img => {
          const searchResult = searchResults.find(r => r.id === img.storage_path);
          if (!searchResult) return null;

          const contextScore = calculateContextualScore(
            searchResult.score,
            img,
            analysis,
            timeContext
          );

          return {
            image: img,
            score: contextScore
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.score.totalScore - a.score.totalScore);

      if (availableImages.length > 0) {
        const topMatch = availableImages[0];
        if (topMatch.score.totalScore > bestScore) {
          bestMatch = topMatch.image;
          bestScore = topMatch.score.totalScore;
          break;
        }
      }
    }

    if (!bestMatch) {
      console.log('No suitable matches found at any topK level');
      return new Response(JSON.stringify({
        success: false,
        error: 'No suitable images found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const registryInvoke = await supabase.functions.invoke("image-registry", {
      body: {
        action: "store",
        userId,
        message_id,
        urls: [bestMatch.full_url],
      },
    });

    if (registryInvoke.error || !registryInvoke.data?.success) {
      console.error('Error storing in image-registry:', registryInvoke.error || registryInvoke.data?.error);
      throw new Error(registryInvoke.data?.error || registryInvoke.error?.message || 'image-registry store failed');
    }

    await redis.sadd(usedSetKey, bestMatch.storage_path);

    return new Response(JSON.stringify({
      success: true,
      chosen: {
        url: bestMatch.full_url,
        title: bestMatch.title,
        description: bestMatch.description,
        placeholder_text: bestMatch.placeholder_text,
        storage_path: bestMatch.storage_path,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('amorine-image-search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
