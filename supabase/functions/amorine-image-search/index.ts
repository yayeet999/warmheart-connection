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
     if (!data.data || data.data.length === 0 || !data.data[0].embedding) {
        throw new Error('Invalid embedding response from OpenAI');
      }
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error; // Re-throw to be caught by the caller
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = session.user.id;

    const searchQuery = buildSearchQuery(analysis);
    const queryVector = await generateEmbeddings(searchQuery);

    let topK = 5;
    let attempts = 0;
    let foundImage = false;
    let selectedImage = null;
    let searchResults;

    while (!foundImage && attempts < 4) {
      searchResults = await vectorIndex.query({
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
        includeVectors: false, // No need to include the vectors
      });

      if (searchResults && searchResults.length > 0) {
          // Get storage paths from the vector search results
          const storagePaths = searchResults.map(result => result.id);

          // Fetch image details and check if they've been sent before
          const { data: images, error: dbError } = await supabase
            .from('image_library')
            .select('id, full_url, tags, title, description, placeholder_text, storage_path')
            .in('storage_path', storagePaths)
            .eq('active', true);

          if (dbError) {
            console.error('Database query error:', dbError);
            throw dbError;
          }

          if (images && images.length > 0) {
            // Check if each image has been sent to the user before
            for (const image of images) {
                const { data: sentData, error: sentError } = await supabase
                    .from('sent_images')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('image_id', image.id) // Use the Supabase image ID
                    .maybeSingle();

                if (sentError) {
                    console.error("Error checking sent_images:", sentError);
                    throw sentError;
                }

                // If sentData is null, the image hasn't been sent
                if (!sentData) {
                    selectedImage = image;
                    foundImage = true;
                    break; // Exit the loop as soon as we find an unused image
                }
            }
          }
      }

      if (!foundImage) {
        // Increase topK for the next attempt
        if (topK === 5) {
          topK = 20;
        } else if (topK === 20) {
          topK = 50;
        } else if (topK === 50) {
          topK = 100;
        }
        attempts++;
      }
    }


    if (!foundImage) {
      console.log('No matching *unused* images found in vector search');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No matching, unused images found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we found an image, proceed as before, but also record it as sent
    if (selectedImage) {
        const processedImage = {
          id: selectedImage.id, // Keep the Supabase ID
          url: selectedImage.full_url, // Use the full URL
          tags: selectedImage.tags,
          title: selectedImage.title,
          description: selectedImage.description,
          placeholder_text: selectedImage.placeholder_text,
          storage_path: selectedImage.storage_path // Include storage_path
        };

        // Record the image as sent
        const { error: insertError } = await supabase
          .from('sent_images')
          .insert({
            user_id: userId,
            image_id: selectedImage.id, // Use the Supabase image ID
          });

        if (insertError) {
          console.error("Error inserting into sent_images:", insertError);
          // Decide if you want to fail the entire request, or just log the error
          // and continue.  For now, we'll continue, but log the error.
        }

        const response = {
          success: true,
          images: [processedImage], // Return the processed image
          searchQuery // Optionally return the search query for debugging
        };

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } else {
      // This should never happen because of the while loop condition, but it's good to have a fallback.
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No matching images found after multiple attempts'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
