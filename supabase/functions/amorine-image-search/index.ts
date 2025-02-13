
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Index } from "npm:@upstash/vector";

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
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

function buildSearchQuery(analysis: any): string {
  const parts = [];
  
  // Add emotional context
  if (analysis.emotional_context) {
    parts.push(`Emotion: ${analysis.emotional_context.overall_tone}`);
    parts.push(`AI Emotion: ${analysis.emotional_context.ai_emotion}`);
  }

  // Add image requirements
  if (analysis.image_requirements) {
    parts.push(`Style: ${analysis.image_requirements.style}`);
    parts.push(`Mood: ${analysis.image_requirements.mood}`);
    parts.push(`Subject: ${analysis.image_requirements.subject_matter}`);
    
    if (analysis.image_requirements.specific_elements) {
      parts.push(`Elements: ${analysis.image_requirements.specific_elements.join(', ')}`);
    }
  }

  // Add temporal context
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
    const { analysis } = await req.json();
    
    if (!analysis) {
      throw new Error('Analysis object is required');
    }

    console.log('Received analysis:', JSON.stringify(analysis));

    // Build search query from analysis
    const searchQuery = buildSearchQuery(analysis);
    console.log('Built search query:', searchQuery);

    // Generate embeddings for the search query
    const queryVector = await generateEmbeddings(searchQuery);
    console.log('Generated embeddings for search query');

    // Search vector index
    const searchResults = await vectorIndex.query({
      vector: queryVector,
      topK: 3,
      includeMetadata: true,
    });

    console.log('Vector search results:', JSON.stringify(searchResults));

    if (searchResults.length === 0) {
      console.log('No matching images found in vector search');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No matching images found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, get all images that match the storage paths
    const storagePaths = searchResults.map(result => result.id);
    console.log('Storage paths from vector search:', storagePaths);

    // Query Supabase to get the UUIDs for these storage paths
    const { data: images, error: dbError } = await supabase
      .from('pregenerated_images')
      .select('id, storage_path, tags')
      .in('storage_path', storagePaths)
      .eq('active', true);

    if (dbError) {
      console.error('Database query error:', dbError);
      throw dbError;
    }

    if (!images || images.length === 0) {
      console.log('No active images found in database');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No active images found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate public URLs for each image
    const imagesWithUrls = images.map(image => {
      // Add .webp extension if not present in storage_path
      const storagePath = image.storage_path.endsWith('.webp') 
        ? image.storage_path 
        : `${image.storage_path}.webp`;

      const { data: { publicUrl } } = supabase
        .storage
        .from('pregenerated-images')
        .getPublicUrl(storagePath);

      return {
        id: image.id,
        url: publicUrl,
        tags: image.tags
      };
    });

    console.log(`Successfully found ${imagesWithUrls.length} images`);
    console.log('Image URLs:', imagesWithUrls.map(img => img.url));

    return new Response(
      JSON.stringify({
        success: true,
        images: imagesWithUrls,
        searchQuery
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in amorine-image-search:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
