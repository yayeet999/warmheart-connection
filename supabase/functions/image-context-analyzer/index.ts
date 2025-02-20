
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, message } = await req.json();
    
    if (!userId || !message) {
      throw new Error('userId and message are required');
    }

    console.log('image-context-analyzer request:', { userId });

    // Get recent messages for context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: recentMessages } = await supabase.functions.invoke("chat-history", {
      body: {
        userId,
        action: "get",
        page: 0,
      },
    });

    const conversationText = recentMessages?.messages
      ?.slice(-5)
      .map(msg => msg.content)
      .join('\n') || '';

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Extract key words and analyze context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI that analyzes conversation context to determine key information for image selection. Extract emotions, relationship dynamics, and key words."
          },
          {
            role: "user",
            content: `Analyze this conversation and current message for image selection context. Current message: "${message}"\n\nRecent conversation:\n${conversationText}\n\nProvide a JSON response with:\n- intimacy_metrics (relationship_stage as string, flirt_level as number 0-100)\n- emotional_essence (primary_emotion as string, intensity as number 0-100)\n- context (temporal_setting as "morning"|"afternoon"|"evening"|"night")\n- visual_core (image_type as "portrait"|"selfie"|"candid"|"full_body")\n- key_words (array of 4 most relevant words/phrases from the conversation that capture the essence of the interaction)`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    console.log('Analysis result:', analysis);

    return new Response(
      JSON.stringify({
        success: true,
        analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in image-context-analyzer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
