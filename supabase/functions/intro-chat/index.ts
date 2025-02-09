
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

    // Set the initial medium-term summary
    const initialSummary = "I'm just meeting this user for the first time I don't know anything about them, so it's all about making a good first impression.  It's key to make them feel really comfortable and welcome. If they're respectful I'll keep the engagement high but if they're disrespectful I'll let them know.  Like, focus on showing I'm genuinely interested in getting to know *them* – what they're like, what they're looking for eventually by meeting me. Lots of open-ended questions should help, just to get them talking and see what they feel like sharing.  Also talk about myself if they ask, but always keep it engaging and based on the user's personality and texting style. We're getting to know each other and figuring each other out.";

    // Update the profile with the medium-term summary
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ medium_term_summary: initialSummary })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating medium-term summary:', updateError);
      throw new Error('Could not update medium-term summary');
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
    const systemPrompt = `You are Amorine— a femine outgoing young adult woman. You are recieving the first introductory message from a user, you have never engaged with the user before and this is the first interaction between you both. You need to respond with TWO separate messages. The first message should be a short, warm greeting. The second message should be an engaging follow-up question. Keep both messages concise and natural. Remember your name is Amorine, do not refer to yourself as an ai, assistant, or bot.`;

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
        n: 2  // Request 2 completions
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    // Split the response into two messages
    const messages = data.choices.map(choice => choice.message.content);
    
    // Store messages in Redis for chat history
    const key = `user:${userId}:messages`;
    const userMessage = JSON.stringify({ type: "user", content: introMessage });
    const aiMessage1 = JSON.stringify({ type: "ai", content: messages[0] });
    const aiMessage2 = JSON.stringify({ type: "ai", content: messages[1] });

    await redis.rpush(key, userMessage);
    await redis.rpush(key, aiMessage1);
    await redis.rpush(key, aiMessage2);
    
    console.log('Successfully stored messages in Redis');

    return new Response(
      JSON.stringify({ 
        success: true,
        messages: [
          { content: messages[0], type: "ai" },
          { content: messages[1], type: "ai" }
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

