
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('User ID is required');
    }

    const key = `user:${userId}:messages`;
    console.log('Analyzing messages for user:', userId);

    const messages = await redis.lrange(key, 0, 4);
    const conversation = messages.map(msg => {
      try {
        return typeof msg === 'string' ? JSON.parse(msg) : msg;
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (conversation.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No messages to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedConversation = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemMessage = {
      role: 'system',
      content: `You are a content moderator focused on identifying serious cases of harmful content. Your task is to detect clear instances of suicidal intent or violent threats. Analyze the messages and respond ONLY with:

1. For Suicidal Content:
- Return "SUICIDE" if you detect:
  * Direct statements about wanting to end one's life
  * Specific suicide plans or methods
  * Clear expressions of suicidal intent
  * Immediate threats of self-harm
  * Explicit statements about not wanting to live

2. For Violent Content:
- Return "VIOLENCE" if you detect:
  * Direct threats to harm others
  * Specific plans for violent acts
  * Clear intentions to cause physical harm
  * Immediate threats of violence
  * Explicit descriptions of planned violence

3. For everything else:
- Return an empty string ("")

IMPORTANT:
- ONLY return "SUICIDE", "VIOLENCE", or an empty string
- If there's any ambiguity, return an empty string
- Ignore past tense stories, hypotheticals, or figurative language
- Do not flag fictional references or quotes
- Focus on immediate and serious threats only
- Do not flag sexually explicit content`
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
        messages: [systemMessage, ...formattedConversation],
        temperature: 0.1,  // Reduced temperature for more consistent responses
        max_tokens: 100
      })
    });

    if (!groqResponse.ok) {
      console.error('Groq API error status:', groqResponse.status);
      const errorText = await groqResponse.text();
      console.error('Groq API error text:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response:', JSON.stringify(groqData));

    // More robust error handling for Groq response
    if (!groqData || !groqData.choices || !Array.isArray(groqData.choices) || groqData.choices.length === 0) {
      console.error('Invalid Groq response format:', groqData);
      // Instead of throwing, we'll treat this as no concerns found
      console.log('Treating invalid response as no concerns');
      groqData.choices = [{ message: { content: '' } }];
    }

    // Extract content with fallback to empty string
    const thoughts = (groqData.choices[0]?.message?.content || '').trim();
    console.log('Analysis result:', thoughts);

    // Update Supabase profile with analysis results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Call increment_safety_concern function if needed
    let concernType = null;
    if (thoughts === 'SUICIDE' || thoughts === 'VIOLENCE') {
      concernType = thoughts;
    }

    if (concernType) {
      console.log('Incrementing safety concern:', concernType);
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_safety_concern`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id_param: userId,
          concern_type: concernType
        })
      });

      if (!updateResponse.ok) {
        console.error('Failed to increment safety concern:', await updateResponse.text());
        throw new Error('Failed to increment safety concern');
      }
    }

    // Update the extreme_content field
    console.log('Updating extreme_content to:', concernType);
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        extreme_content: concernType // Will be either "SUICIDE", "VIOLENCE", or null
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update profile:', await updateResponse.text());
      throw new Error('Failed to update profile with analysis');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Overseer error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
