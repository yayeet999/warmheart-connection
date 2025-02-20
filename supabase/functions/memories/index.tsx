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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, page = 0, pageSize = 20 } = await req.json();
    
    if (!userId) {
      throw new Error("Missing userId in request body");
    }

    console.log(`Fetching memories for user ${userId}, page ${page}`);

    // Calculate start and end indices for pagination
    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Get total count of memories
    const key = `user:${userId}:memories`;
    const totalMemories = await redis.llen(key);

    // Fetch paginated memories
    const memories = await redis.lrange(key, start, end);
    console.log(`Retrieved ${memories.length} memories`);

    // Parse memories and handle any invalid JSON
    const parsedMemories = memories.map((memory) => {
      try {
        return typeof memory === "string" ? JSON.parse(memory) : memory;
      } catch (e) {
        console.error("Error parsing memory:", e);
        return null;
      }
    }).filter(Boolean); // Remove any null values from parsing errors

    // Calculate if there are more pages
    const hasMore = totalMemories > (page + 1) * pageSize;

    return new Response(
      JSON.stringify({
        success: true,
        memories: parsedMemories,
        hasMore,
        total: totalMemories
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error in memories function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
}); 
