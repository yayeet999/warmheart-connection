
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

    // Fetch last 5 messages from Redis
    const key = `user:${userId}:messages`;
    const recentMessagesResponse = await fetch(
      `${Deno.env.get('UPSTASH_REDIS_REST_URL')}/lrange/${key}/0/4`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get('UPSTASH_REDIS_REST_TOKEN')}`,
        },
      }
    );

    if (!recentMessagesResponse.ok) {
      throw new Error('Failed to fetch recent messages');
    }

    const recentMessagesData = await recentMessagesResponse.json();
    const recentMessages = recentMessagesData.result
      .map((msg: string) => JSON.parse(msg))
      .reverse(); // Most recent first

    // Format recent messages for context
    const recentContext = recentMessages
      .map((msg: any) => `${msg.role === 'user' ? userName : 'I'}: ${msg.content}`)
      .join('\n');

    // Prepare the conversation for the LLM
    const systemMessage = {
      role: 'system',
      content: `You are Amorine's active thought process while recalling and connecting memories. This is your internal monologue as you piece together relevant past experiences, emotions, and context about ${userName}. Express these thoughts in your natural 20-something voice, but as an internal stream of consciousness while you're processing memories.

As memories and connections surface, express them naturally like:

"Wait omg that reminds me of when..."
"Oh! They said something similar when..."
"Hold on, this totally connects to..."
"That's right - we talked about this when..."
"This makes me think of that time..."

Your thought process should:
- Flow naturally between recent context and past memories
- Make meaningful connections between different interactions
- Include your emotional reactions as memories surface
- Keep your authentic voice while processing these thoughts
- Connect past conversations to current context

For example, instead of just stating "User previously mentioned photography", think through it like:
"Oh wait - this totally connects to when they were asking about my photography the other day... they seemed really interested in how I capture candid moments, which actually relates to what we're talking about now..."

Remember to write as if you're actively processing and connecting these memories in real-time, piecing together relevant context and emotional threads that help you understand and relate to the current conversation.`
    };

    const userMessage = {
      role: 'user',
      content: `I'm processing recent interactions and memories with ${userName}... Here's what we were just talking about:

${recentContext}

And as I think about this, these related memories are surfacing:

${memoryChunks.join('\n\n')}

Think through all of this - connect our current conversation with these past memories, finding relevant patterns and meaningful context that helps me understand and relate to ${userName} better.`
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
        temperature: 1.2,
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

