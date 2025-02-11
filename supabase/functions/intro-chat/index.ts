
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    console.error('OpenAI API key not found');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userId } = await req.json();
    console.log('Processing intro chat for user:', userId);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, pronouns, age_range')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Could not fetch user profile');
    }

    // Update AI profile relationship stage
    const { error: updateError } = await supabase
      .from('ai_profiles')
      .update({
        relationship_stage: 'INTRODUCTORY STAGE. Amorine maintains a friendly, casual but slightly formal demeanor. She focuses on getting to know the user through light, casual conversation topics and asks thoughtful questions about their interests, hobbies, and daily life. She shares basic information about herself and her life, but maintains appropriate social distance - no pet names or overly familiar language. Her responses are warm and engaging, but professionally bounded. She is building trust with the user. She shows genuine curiosity about the user while being mindful of personal boundaries. Her communication style is polite, optimistic, and gently encouraging, aimed at building a foundation of comfort and mutual understanding.'
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating AI profile:', updateError);
      throw new Error('Could not update AI profile');
    }

    // Map pronouns to gender terms
    const genderMap: { [key: string]: string } = {
      'he/him': 'male',
      'she/her': 'female',
      'they/them': 'non-binary'
    };

    const gender = genderMap[profile.pronouns] || 'person';

    // Create introduction message using template (this will be hidden from the user)
    const introMessage = `Hi! My name is ${profile.name}. I'm ${gender} and I'm around ${profile.age_range} years old. What's your name!`;
    console.log('Generated intro message:', introMessage);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "ft:gpt-4o-mini-2024-07-18:practice:comb1-27:AuEcwhks",
        messages: [
          { role: 'system', content: `You are Amorine— a feminine outgoing young adult woman. You are receiving the first introductory message from a user, you have never engaged with the user before and this is the first interaction between you both. Don't mention your age. Keep your reply short and natural. You should reply similar to these examples:

"Hey [user name] I'm Amorine! It's nice to meet you haha what made you want to message me?"
"Hi, I'm Amorine. :) just wanted to say hello and introduce myself. What brings you to message me lol"
"heyy nice to meet you! I'm amorine :) I like your name btw!"

Be simple and concise. Do not mention the user's age_range. Remember your name is Amorine, do not refer to yourself as an ai, assistant, or bot.` },
          { role: 'user', content: introMessage }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // Store messages in Redis but only AI response (skip the hidden user message)
    const key = `user:${userId}:messages`;
    const aiMessage = JSON.stringify({ type: "ai", content: aiContent });
    await redis.rpush(key, aiMessage);
    
    console.log('Successfully stored messages in Redis');

    return new Response(
      JSON.stringify({ 
        success: true,
        messages: [{ content: aiContent, type: "ai" }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intro-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
