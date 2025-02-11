
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, memoryChunks } = await req.json();
    
    if (!userId || !Array.isArray(memoryChunks)) {
      throw new Error('Invalid request parameters');
    }

    console.log('Processing memory chunks for user:', userId);
    console.log('Number of chunks:', memoryChunks.length);

    // Prepare the conversation for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are an expert at converting fragmented memory chunks into coherent, natural language summaries. Your task is to:
1. Take the provided memory chunks
2. Analyze their content and relationships
3. Create a clear, flowing narrative that captures the key information
4. Focus on maintaining context and relevance
5. Be concise but comprehensive

Output should be in natural language, as if explaining someone's conversation history to provide context for their next interaction.`
    };

    const userMessage = {
      role: 'user',
      content: `Here are the memory chunks to process:\n\n${memoryChunks.join('\n\n')}\n\nPlease convert these into a natural, flowing summary that captures the key context and information.`
    };

    console.log('Sending request to Groq API...');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemMessage, userMessage],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, error);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const processedMemory = groqData.choices[0].message.content;

    console.log('Successfully processed memories');

    // Update Supabase profile with processed memory
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          vector_long_term: processedMemory,
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Failed to update profile with processed memory');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processedMemory 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in middle-thoughts function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
