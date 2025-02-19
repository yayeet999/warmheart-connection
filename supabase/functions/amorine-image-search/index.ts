
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Index } from "npm:@upstash/vector";
import { getUser } from "https://deno.land/x/supabase_edge_auth@1.3.0/mod.ts";

// Initialize Upstash Vector
const vectorIndex = new Index({
  url: Deno.env.get("amorineIMAGE_UPSTASH_VECTOR_REST_URL")!,
  token: Deno.env.get("amorineIMAGE_UPSTASH_VECTOR_REST_TOKEN")!,
  namespace: "amorine-image", // Keep the same namespace
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Generate embeddings using OpenAI's /v1/embeddings endpoint */
async function generateEmbeddings(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    throw new Error("OpenAI API key not found");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 384, // consistent dimension
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  if (!data.data || data.data.length === 0 || !data.data[0].embedding) {
    throw new Error("Invalid embedding response from OpenAI");
  }
  return data.data[0].embedding;
}

/** Build a short search query from the analysis object */
function buildSearchQuery(analysis: any): string {
  const parts: string[] = [];

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
      parts.push(
        `Elements: ${analysis.image_requirements.specific_elements.join(", ")}`
      );
    }
  }

  // Add temporal context
  if (analysis.temporal_context) {
    parts.push(`Time: ${analysis.temporal_context.time_of_day}`);
    parts.push(`Setting: ${analysis.temporal_context.setting}`);
  }

  return parts.join(". ");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use getUser() to retrieve the user info from the JWT
    const user = await getUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const userId = user.sub; // The user's ID from the token

    // Parse request body
    const { analysis } = await req.json();
    if (!analysis) {
      throw new Error("Analysis object is required");
    }

    // Build search query from analysis
    const searchQuery = buildSearchQuery(analysis);
    // Generate embeddings for the query
    const queryVector = await generateEmbeddings(searchQuery);

    // We'll attempt up to 4 times (with topK = 5, 20, 50, 100)
    let topK = 5;
    let attempts = 0;
    let foundImage = false;
    let selectedImage = null;
    let searchResults;

    while (!foundImage && attempts < 4) {
      // Query Upstash vector
      searchResults = await vectorIndex.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        includeVectors: false,
      });

      if (searchResults && searchResults.length > 0) {
        // Get storage_paths from vector search
        const storagePaths = searchResults.map((res) => res.id);

        // Fetch those images from supabase
        const { data: images, error: dbError } = await supabase
          .from("image_library")
          .select("id, full_url, tags, title, description, placeholder_text, storage_path")
          .in("storage_path", storagePaths)
          .eq("active", true);

        if (dbError) {
          console.error("Database query error:", dbError);
          throw dbError;
        }

        if (images && images.length > 0) {
          // Check which images have not been sent to this user
          for (const img of images) {
            const { data: sentData, error: sentError } = await supabase
              .from("sent_images")
              .select("id")
              .eq("user_id", userId)
              .eq("image_id", img.id)
              .maybeSingle();

            if (sentError) {
              console.error("Error checking sent_images:", sentError);
              throw sentError;
            }

            // If no existing record, it's not sent yet
            if (!sentData) {
              selectedImage = img;
              foundImage = true;
              break;
            }
          }
        }
      }

      if (!foundImage) {
        // Increase topK for the next iteration
        if (topK === 5) topK = 20;
        else if (topK === 20) topK = 50;
        else if (topK === 50) topK = 100;
        attempts++;
      }
    }

    if (!foundImage) {
      console.log("No matching *unused* images found in vector search");
      return new Response(
        JSON.stringify({ success: false, error: "No matching, unused images found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // We found an image, record it as "sent"
    if (selectedImage) {
      const processedImage = {
        id: selectedImage.id,
        url: selectedImage.full_url,
        tags: selectedImage.tags,
        title: selectedImage.title,
        description: selectedImage.description,
        placeholder_text: selectedImage.placeholder_text,
        storage_path: selectedImage.storage_path,
      };

      // Insert into sent_images
      const { error: insertError } = await supabase
        .from("sent_images")
        .insert({
          user_id: userId,
          image_id: selectedImage.id,
        });

      if (insertError) {
        console.error("Error inserting into sent_images:", insertError);
        // We won't throw, but we do log it
      }

      const responseBody = {
        success: true,
        images: [processedImage],
        searchQuery, // optional debugging
      };
      return new Response(JSON.stringify(responseBody), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback (shouldn't be reached)
    return new Response(
      JSON.stringify({ success: false, error: "No matching images after attempts" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in amorine-image-search:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
