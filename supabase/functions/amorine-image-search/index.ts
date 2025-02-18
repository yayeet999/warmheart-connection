import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from "https://deno.land/x/openai@v4.14.1/mod.ts";

const openAIKey = Deno.env.get('OPENAI_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!openAIKey) {
  console.error('OPENAI_KEY is not set')
  Deno.exit(1)
}

if (!supabaseUrl) {
  console.error('SUPABASE_URL is not set')
  Deno.exit(1)
}

if (!supabaseAnonKey) {
  console.error('SUPABASE_ANON_KEY is not set')
  Deno.exit(1)
}

if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    Deno.exit(1);
}

const openai = new OpenAI({
  apiKey: openAIKey,
});

const supabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { analysis } = await req.json()
    console.log('Received analysis:', analysis)

    if (!analysis) {
      throw new Error('No analysis provided')
    }

    const { data: results, error } = await supabaseClient.from('image_library')
      .select('*')
      .like('tags', `%${analysis.primarySubject}%`)
      .limit(9)

    if (error) {
      console.error('Error during vector search:', error)
      throw new Error('Vector search failed')
    }

    // Modified response to include placeholder_text
    const images = await Promise.all(
      results.map(async (result) => {
        return {
          url: result.full_url,
          placeholder_text: result.placeholder_text || 'An AI-generated image'
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        images
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
