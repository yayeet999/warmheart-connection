
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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (analysis.key_words?.length) {
      parts.push(analysis.key_words.join(', '));
    }

    if (currentMessage) {
      parts.push(currentMessage);
    }

    if (analysis.intimacy_metrics?.relationship_stage) {
      const stage = analysis.intimacy_metrics.relationship_stage.toLowerCase()
        .replace(/_/g, ' ')
        .replace(/phase|stage/g, '').trim();
      parts.push(stage);
    }

    if (analysis.context?.temporal_setting) {
      parts.push(analysis.context.temporal_setting.toLowerCase());
    }

    if (analysis.intimacy_metrics?.flirt_level > 0) {
      const flirtLevel = analysis.intimacy_metrics.flirt_level;
      if (flirtLevel > 80) {
        parts.push("very flirtatious");
      } else if (flirtLevel > 50) {
        parts.push("flirty");
      } else if (flirtLevel > 20) {
        parts.push("playful");
      }
    }

    if (analysis.visual_core?.image_type) {
      parts.push(analysis.visual_core.image_type.toLowerCase());
    }

    if (analysis.emotional_essence?.intensity > 50 && analysis.emotional_essence?.primary_emotion) {
      parts.push(analysis.emotional_essence.primary_emotion.toLowerCase());
    }

    return parts.filter(Boolean).join('. ');
  } catch (error) {
    console.error('Error building search query:', error);
    return currentMessage || 'amorine';
  }
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
        data: searchQuery,
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

    // Register the image with the registry
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
