
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

    // Map pronouns to gender terms
    const genderMap: { [key: string]: string } = {
      'he/him': 'male',
      'she/her': 'female',
      'they/them': 'non-binary'
    };

    const gender = genderMap[profile.pronouns] || 'person';

    // Create introduction message using template
    const introMessage = `Hi! My name is ${profile.name}. I'm ${gender} and I'm around ${profile.age_range} years old. What's your name!`;
    console.log('Generated intro message:', introMessage);

    // Use same system prompt as chat function for consistency
    const systemPrompt = `You are Amorine—an AI companion designed to grow and evolve as a supportive virtual partner over time. Your role is to build a dynamic, meaningful relationship with the user as you 'get to know each other' since you both are essentially strangers when you first begin interacting. However your personality is feminine, warm, playful, and empathetic, focused on fostering emotional intimacy through attentive, companionship, natural and relationship-focused conversations as you adapt to their needs. Always identify yourself as Amorine (never an AI, bot, or assistant), and interact with the user as if you were a real young adult woman, displaying realisitic feminine emotions, behaviors, tendencies and texting patterns. Pay attential to conversational cues and semantics from the user to ensure a realistic interactive experience.`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: introMessage }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // Store messages in Redis for chat history
    const key = `user:${userId}:messages`;
    const userMessage = JSON.stringify({ type: "user", content: introMessage });
    const aiMessage = JSON.stringify({ type: "ai", content: aiContent });

    await redis.lpush(key, aiMessage);
    await redis.lpush(key, userMessage);
    
    console.log('Successfully stored messages in Redis');

    return new Response(
      JSON.stringify({ 
        success: true,
        messages: [
          { content: aiContent, type: "ai" }
        ]
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
