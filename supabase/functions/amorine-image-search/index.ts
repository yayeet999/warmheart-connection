
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { analysis } = await req.json();
    
    if (!analysis || !analysis.keywords) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid analysis format - missing keywords',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get images directly based on keyword matching
    const keywords = analysis.keywords.map((k: string) => k.toLowerCase());
    
    // Instead of using RPC, let's directly query the image library
    // and use array overlap to find matching tags
    const { data: images, error: dbError } = await supabase
      .from('image_library')
      .select('id, full_url, tags, title, description, placeholder_text')
      .contains('tags', keywords)
      .eq('active', true)
      .limit(5);

    if (dbError) {
      console.error('Error fetching images:', dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database query failed',
          details: dbError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (!images?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No matching images found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Map the images to the response format
    const responseImages = images.map((img) => ({
      url: img.full_url,
      description: img.description,
      placeholder_text: img.placeholder_text || "Here's an image that matches what you described.",
      title: img.title,
      tags: img.tags,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        images: responseImages,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in amorine-image-search:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
