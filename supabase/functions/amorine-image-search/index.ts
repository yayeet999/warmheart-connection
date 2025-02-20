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

function buildSearchQuery(analysis: any, recentMessages: Message[] = [], currentMessage: string = ''): string {
  const parts = [];

  try {
    // Part 1: Current message with high emphasis (60% weight)
    if (currentMessage) {
      parts.push(`CURRENT MESSAGE CONTEXT: ${currentMessage}`);
    }

    // Part 2: Recent conversation context
    if (recentMessages.length) {
      parts.push('RECENT CONVERSATION:');
      recentMessages.forEach(msg => {
        parts.push(`${msg.role.toUpperCase()}: ${msg.content}`);
      });
    }

    // Part 3: Structured analysis (40% weight)
    parts.push('ANALYSIS CONTEXT:');

    // Emotional Context
    if (analysis.emotional_essence) {
      const emotional = analysis.emotional_essence;
      parts.push(`Primary Emotion: ${emotional.primary_emotion}`);
      
      if (emotional.secondary_emotions?.length) {
        parts.push(`Secondary Emotions: ${emotional.secondary_emotions.join(', ')}`);
      }
      
      if (emotional.mood) {
        const valence = emotional.mood.valence;
        const energy = emotional.mood.energy;
        
        const valenceDesc = valence > 50 ? 'very positive' : 
                           valence > 0 ? 'positive' :
                           valence > -50 ? 'negative' : 'very negative';
                           
        const energyDesc = energy > 75 ? 'very energetic' :
                          energy > 50 ? 'energetic' :
                          energy > 25 ? 'calm' : 'very calm';
                          
        parts.push(`Mood: ${valenceDesc} and ${energyDesc}`);
      }
    }

    // Visual Elements
    if (analysis.visual_core) {
      const visual = analysis.visual_core;
      if (visual.image_type) {
        parts.push(`Image Type: ${visual.image_type}`);
      }
      
      if (visual.composition) {
        const comp = visual.composition;
        parts.push(`Focus: ${comp.focal_point}`);
        parts.push(`Depth: ${comp.depth}`);
        parts.push(`Lighting: ${comp.lighting}`);
      }
    }

    // Semantic Content
    if (analysis.semantic_content) {
      const semantic = analysis.semantic_content;
      
      if (semantic.primary_subject) {
        const subject = semantic.primary_subject;
        parts.push(`Category: ${subject.category}`);
        parts.push(`Subject: ${subject.specific_description}`);
        
        if (subject.key_attributes?.length) {
          parts.push(`Key Features: ${subject.key_attributes.join(', ')}`);
        }
      }

      if (semantic.supporting_elements?.length) {
        const significantElements = semantic.supporting_elements
          .filter(elem => elem.significance > 50) // Only include highly significant elements
          .map(elem => elem.element);
          
        if (significantElements.length) {
          parts.push(`Supporting Elements: ${significantElements.join(', ')}`);
        }
      }

      if (semantic.symbolic_meaning) {
        parts.push(`Symbolism: ${semantic.symbolic_meaning}`);
      }
    }

    // Intimacy Context (with careful handling)
    if (analysis.intimacy_metrics) {
      const intimacy = analysis.intimacy_metrics;
      
      // Only include intimacy-related terms if the levels are significant
      if (intimacy.suggestiveness > 20 || intimacy.flirt_level > 20) {
        parts.push(`Style: ${intimacy.outfit_style}`);
        parts.push(`Interaction Distance: ${intimacy.personal_space}`);
      }
    }

    // Context
    if (analysis.context) {
      const context = analysis.context;
      
      if (context.environment) {
        parts.push(`Setting: ${context.environment}`);
      }
      
      if (context.temporal_setting) {
        parts.push(`Time Context: ${context.temporal_setting}`);
      }
      
      if (context.atmosphere) {
        parts.push(`Atmosphere: ${context.atmosphere}`);
      }

      if (context.intended_purpose?.length) {
        parts.push(`Purpose: ${context.intended_purpose.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Error building search query:', error);
    // Enhanced fallback that includes current message
    return `${currentMessage || ''} ${analysis.semantic_content?.primary_subject?.specific_description || 'general image'}`.trim();
  }

  // Filter out any empty parts and join with clear section separation
  return parts.filter(part => part && part.length > 0).join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Updated: Expect recent messages and current message
    const { analysis, userId, message_id, recentMessages, currentMessage } = await req.json();
    if (!analysis || !userId || !message_id) {
      throw new Error('analysis, userId, and message_id are required');
    }

    console.log('amorine-image-search request:', { userId, message_id });

    // 1) Build the enhanced search query with conversation context
    const searchQuery = buildSearchQuery(analysis, recentMessages, currentMessage);
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

    // 3) Add chosen image to the user's used_images set
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
