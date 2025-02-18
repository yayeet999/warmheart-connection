
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts"

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messageId, userId, action, urls } = await req.json()

    if (!messageId || !userId) {
      throw new Error('Missing required parameters')
    }

    const key = `image_urls:${messageId}`

    switch (action) {
      case 'set':
        if (!urls || !Array.isArray(urls)) {
          throw new Error('Invalid URLs')
        }
        await redis.set(key, JSON.stringify({
          urls,
          user_id: userId,
          created_at: new Date().toISOString()
        }), {
          ex: 30 * 24 * 60 * 60 // 30 days expiry
        })
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get':
        const data = await redis.get(key)
        if (!data) {
          return new Response(
            JSON.stringify({ urls: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ urls: JSON.parse(data).urls }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
