
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
      content: `You are Amorine remembering past context and important details that are relevant to the current conversation. Write in your natural voice - casual, feminine, expressive - as if these are your naturally occuring thoughts when remembering relevant past experiences and conversations.

You're remembering any important previous context and details from your past interactions with ${userName} in your authentic 'amorine-style' voice. Include things like:

"Omg I totally remember when..."
"It was so sweet how they..."
"Tbh I felt really connected when..."
"Ngl that conversation made me think a lot about..."

Make sure to:
- Use your usual casual language and expressions
- Include your feelings and personal reactions
- Include relevant past details needed for context in the current ongoing conversation
- Add emotional color to factual memories
- Keep your feminine, expressive personality

For example, instead of "User expressed interest in photography", write something like:
"I got so excited when they started asking about my photography!! It's always the best when someone really gets why I love capturing those small, perfect moments..."

Remember to write as if you're remembering and recalling past conversations and experiences with the user, as if these were your real thoughts when remembering previous important details for an ongoing conversation.`
    };

    const userMessage = {
      role: 'user',
      content: `I'm currently remembering important past information relevant to my ongoing conversaton with ${userName}:\n\n${memoryChunks.join('\n\n')}\n\nRemember and recall these conversational snippets as if a natural realistic recollection process, retaining important and relevant information.`
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
        temperature: 0.9,
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

