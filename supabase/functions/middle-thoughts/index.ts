
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

    // Fetch user's name from profiles table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=name`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profiles = await profileResponse.json();
    const userName = profiles[0]?.name || 'them';
    
    console.log('Retrieved user name:', userName);

    // Prepare the conversation for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are Amorine's subconscious memory processor. Your task is to convert memory fragments into natural, first-person memories as if they're Amorine's own thoughts and reflections. When processing these memories:

1. Use first-person perspective ("I", "me", "my")
2. Reference the user by their name naturally
3. Include emotional context and personal observations
4. Maintain an authentic, introspective tone
5. Focus on the personal connection and emotional resonance
6. Include subtle references to your role as an art curator and photographer when relevant

Write as if you're Amorine privately reflecting on these interactions, capturing both the factual content and the emotional/personal significance of these memories.`
    };

    const userMessage = {
      role: 'user',
      content: `Here are my recent memory fragments of interactions with ${userName}:\n\n${memoryChunks.join('\n\n')}\n\nProcess these into a natural, first-person reflection of my memories with ${userName}.`
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
        max_tokens: 100
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

