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
  if (!data?.data?.[0]?.embedding) {
    throw new Error('Invalid embedding response from OpenAI');
  }
  return data.data[0].embedding;
}

function buildSearchQuery(analysis: any): string {
  const parts = [];

  // Just as an example, same logic you had...
  if (analysis.emotional_context) {
    parts.push(`Emotion: ${analysis.emotional_context.overall_tone}`);
    parts.push(`AI Emotion: ${analysis.emotional_context.ai_emotion}`);
  }
  if (analysis.image_requirements) {
    parts.push(`Style: ${analysis.image_requirements.style}`);
    parts.push(`Mood: ${analysis.image_requirements.mood}`);
    parts.push(`Subject: ${analysis.image_requirements.subject_matter}`);
    if (analysis.image_requirements.specific_elements) {
      parts.push(`Elements: ${analysis.image_requirements.specific_elements.join(', ')}`);
    }
  }
  if (analysis.temporal_context) {
    parts.push(`Time: ${analysis.temporal_context.time_of_day}`);
    parts.push(`Setting: ${analysis.temporal_context.setting}`);
  }

  return parts.join('. ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Expect: { analysis, userId, message_id }
    const { analysis, userId, message_id } = await req.json();
    if (!analysis || !userId || !message_id) {
      throw new Error('analysis, userId, and message_id are required');
    }

    console.log('amorine-image-search request:', { userId, message_id });

    // 1) Build the search query
    const searchQuery = buildSearchQuery(analysis);
    const queryVector = await generateEmbeddings(searchQuery);

    // The Redis set we use for used images:
    const usedSetKey = `used_images:${userId}`;

    // We'll do multiple topK attempts:
    const topKs = [5, 10, 20];

    let foundImages: any[] = [];
    for (const k of topKs) {
      console.log(`Searching vector index with topK=${k}...`);
      const searchResults = await vectorIndex.query({
        vector: queryVector,
        topK: k,
        includeMetadata: true,
      });

      if (!searchResults?.length) {
        console.log(`No results at topK=${k}`);
        continue; // try bigger topK
      }

      // Filter out images that user has used before
      console.log(`Filtering out used images for user ${userId}`);
      const usedPaths = await redis.smembers(usedSetKey);
      const usedPathSet = new Set(usedPaths || []);

      // We also must fetch the images from supabase based on each search result ID
      // because the ID we stored in Upstash vector is the "storage_path"
      // Or if you used the DB ID, adapt as needed
      const storagePaths = searchResults.map(r => r.id);

      const { data: images, error } = await supabase
        .from('image_library')
        .select('id, full_url, tags, title, description, placeholder_text, storage_path, active')
        .in('storage_path', storagePaths); 
      
      if (error) {
        console.error('Database query error:', error);
        throw new Error(error.message);
      }

      // Filter out inactive or used
      const activeImages = images?.filter(img => img.active) || [];
      const notUsedImages = activeImages.filter(img => !usedPathSet.has(img.storage_path));

      if (notUsedImages.length) {
        foundImages = notUsedImages;
        break;
      }
    }

    if (!foundImages.length) {
      console.log('No unused images available at any topK level!');
      return new Response(JSON.stringify({
        success: false,
        error: 'No unused images found, or no matching results'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // For simplicity, let's just pick the FIRST or random from foundImages
    // If you want random:
    // const chosen = foundImages[Math.floor(Math.random() * foundImages.length)];
    const chosen = foundImages[0];

    // 2) Store chosen in "image-registry" (with 1-day TTL, for instance)
    const registryInvoke = await supabase.functions.invoke("image-registry", {
      body: {
        action: "store",
        userId,
        message_id,
        urls: [chosen.full_url],
      },
    });
    if (registryInvoke.error || !registryInvoke.data?.success) {
      console.error('Error storing in image-registry:', registryInvoke.error || registryInvoke.data?.error);
      throw new Error(registryInvoke.data?.error || registryInvoke.error?.message || 'image-registry store failed');
    }

    // 3) Add chosen image to the user’s used_images set
    await redis.sadd(usedSetKey, chosen.storage_path);

    // 4) Return the single chosen image
    return new Response(JSON.stringify({
      success: true,
      chosen: {
        url: chosen.full_url,
        title: chosen.title,
        description: chosen.description,
        placeholder_text: chosen.placeholder_text,
        storage_path: chosen.storage_path,
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
