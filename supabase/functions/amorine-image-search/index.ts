
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
      throw new Error('Invalid analysis format');
    }

    // Get the storage paths that match the keywords
    const keywords = analysis.keywords.map((k: string) => k.toLowerCase());
    
    const { data: storagePaths, error: pathError } = await supabase.rpc(
      'match_image_keywords',
      { p_keywords: keywords }
    );
    
    if (pathError) {
      console.error('Error matching keywords:', pathError);
      throw pathError;
    }

    if (!storagePaths?.length) {
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

    // Get the full image data for the matching paths
    const { data: images, error: dbError } = await supabase
      .from('image_library')
      .select('id, full_url, tags, title, description, placeholder_text')
      .in('storage_path', storagePaths)
      .eq('active', true);

    if (dbError) {
      console.error('Error fetching images:', dbError);
      throw dbError;
    }

    if (!images?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active images found',
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
      placeholder_text: img.placeholder_text,
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
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
