import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, message_id, urls } = await req.json();

    if (!action || !userId || !message_id) {
      throw new Error('Missing required fields: action, userId, and message_id.');
    }

    // "store" workflow: store an array of image URLs under "image_urls:{message_id}"
    if (action === "store") {
      if (!urls || !Array.isArray(urls)) {
        throw new Error('For action="store", you must provide an array "urls".');
      }

      const key = `image_urls:${message_id}`;
      const value = {
        urls,
        user_id: userId,
        created_at: new Date().toISOString(),
      };

      // Set a 1-day TTL (24 hours = 86400 seconds)
      await redis.set(key, JSON.stringify(value), { ex: 86400 });
      console.log(`Stored URLs for message_id ${message_id} with 1-day TTL:`, value);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "get" workflow: retrieve the stored URLs for a message_id
    if (action === "get") {
      const key = `image_urls:${message_id}`;
      const result = await redis.get(key);

      console.log(`Retrieved data for message_id ${message_id}:`, result);

      if (!result) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No images found for this message_id." 
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Handle the Redis response safely
      let parsed;
      try {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      } catch (parseError) {
        console.error("Error parsing Redis data:", parseError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid data format in storage." 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!parsed || !parsed.urls) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid data structure in storage." 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, urls: parsed.urls }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (error) {
    console.error("image-registry error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
