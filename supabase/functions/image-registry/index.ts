import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function stores/fetches image URLs in Redis under keys like "image_urls:{message_id}".
 * Request body must have:
 *   { action: "store"|"get", userId: string, message_id: string, urls?: string[] }.
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

    // Action: store
    if (action === "store") {
      if (!urls || !Array.isArray(urls)) {
        throw new Error('For "store" action, you must provide an array "urls".');
      }
      const key = `image_urls:${message_id}`;
      const value = {
        urls,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      await redis.set(key, JSON.stringify(value));
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get
    if (action === "get") {
      const key = `image_urls:${message_id}`;
      const raw = await redis.get<string>(key);
      if (!raw) {
        return new Response(
          JSON.stringify({ success: false, error: "No images found for this message_id." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const parsed = JSON.parse(raw);
      return new Response(
        JSON.stringify({ success: true, urls: parsed.urls }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
