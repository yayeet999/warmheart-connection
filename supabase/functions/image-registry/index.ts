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

/**
 * This edge function handles storing/fetching image URLs in Redis.
 * Request body must have { action: "store" | "get", userId, message_id, urls? }.
 *
 * - action="store": store an array of URLs in Redis under key `image_urls:{message_id}`.
 *   Value: { urls, user_id, created_at }
 *
 * - action="get": retrieve the array of URLs for a given message_id.
 *
 * On success, returns JSON { success: true, urls?: string[] }.
 * On error, returns { error: string } with non-200 status.
 */
serve(async (req: Request) => {
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

      await redis.set(key, JSON.stringify(value));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "get" workflow: retrieve the stored URLs for a message_id
    if (action === "get") {
      const key = `image_urls:${message_id}`;
      const result = await redis.get<string>(key);

      if (!result) {
        return new Response(
          JSON.stringify({ success: false, error: "No images found for this message_id." }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const parsed = JSON.parse(result);
      return new Response(JSON.stringify({ success: true, urls: parsed.urls }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (error) {
    console.error("image-registry error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
