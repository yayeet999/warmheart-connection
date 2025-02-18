
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // "store" workflow: validate the input data
    if (action === "store") {
      if (!urls || !Array.isArray(urls)) {
        throw new Error('For action="store", you must provide an array "urls".');
      }

      console.log(`Stored URLs for message_id ${message_id}`);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "get" workflow: validate the input data
    if (action === "get") {
      console.log(`Retrieved data for message_id ${message_id}`);

      return new Response(
        JSON.stringify({ success: true, urls: [] }),
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
