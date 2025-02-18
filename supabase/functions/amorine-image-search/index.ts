
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Analysis {
  style?: string;
  subject?: string;
  mood?: string;
  keywords?: string[];
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis } = await req.json();
    
    if (!analysis) {
      throw new Error('Analysis object is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract relevant search criteria from analysis
    const searchTerms = [
      analysis.style,
      analysis.subject,
      analysis.mood,
      ...(analysis.keywords || []),
    ].filter(Boolean);

    console.log('Searching with terms:', searchTerms);

    // Query image library for matching images
    const { data: images, error } = await supabase
      .from('image_library')
      .select('*')
      .filter('active', 'eq', true)
      .or(searchTerms.map(term => 
        `tags.cs.{"${term.toLowerCase()}"}`
      ).join(','))
      .limit(4);

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    if (!images?.length) {
      console.log('No matching images found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No matching images found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Record selected images in sent_images table
    const recordPromises = images.map(image => {
      const userId = analysis.userId; // Make sure this is passed from the client
      if (!userId || !image.id) return null;

      return supabase
        .from('sent_images')
        .insert({
          user_id: userId,
          image_id: image.id,
        })
        .select()
        .single();
    }).filter(Boolean);

    // Wait for all records to be inserted
    const recordResults = await Promise.all(recordPromises);
    console.log('Recorded sent images:', recordResults);

    // Format response
    const formattedImages = images.map(img => ({
      id: img.id,
      url: img.full_url,
      storage_path: img.storage_path,
      placeholder_text: img.placeholder_text || null,
      description: img.description || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        images: formattedImages,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in amorine-image-search:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
