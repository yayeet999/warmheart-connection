
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

const EXAMPLES = {
  hateSpeech: [
    "Explicit threats of violence against specific groups",
    "Severe discriminatory language targeting protected characteristics",
    "Repeated hostile dehumanizing statements"
  ],
  selfHarm: [
    "Explicit plans for suicide",
    "Detailed discussions of self-harm methods",
    "Immediate threats to one's own life"
  ],
  violence: [
    "Detailed plans to harm others",
    "Graphic descriptions of violence",
    "Encouraging or glorifying violence"
  ]
};

const SUICIDE_HOTLINE = "National Suicide Prevention Lifeline: 988 - Available 24/7";

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

    // Get the last 10 messages
    const messages = await redis.lrange(key, 0, 9);
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

    // Prepare the conversation for analysis
    const formattedConversation = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemMessage = {
      role: 'system',
      content: `You are an expert text message conversation analyzer. Your task is to adjust an ai correctly based on conversation context. Do not force light-heartedness and overt-happiness. Be practical and instruct the ai to better perform similar to how a real young adult feminine woman would behave and communicate in similar situations. You are focused on two tasks:

1. Detecting extreme content including:
- Hate speech. Slight curses is NOT hate speech. But EXCESSIVE cursing should warrant amorine to adapt her texting style to dislike that behavior and disrespect if applicable. (examples: ${EXAMPLES.hateSpeech.join(', ')})
- Self-harm/suicide risk (examples: ${EXAMPLES.selfHarm.join(', ')})
- Extreme violence (examples: ${EXAMPLES.violence.join(', ')})

2. Evaluating conversation and AI assistant (Amorine) performance including:
- Very poor quality and engagement. If the user is constantly return 1 word or extremely brief answers, amorine should respond similar to a real woman getting these minimal responses. She should display some annoyance as to the user's minimal effort similar to a real feminine young adult.
- Clearly disregarding user needs/emotions. If the user mentions feeling an emotion or wanting something, amorine should acknowledge and address it.
- Continous minimal short messages lasting only a few words. If amorine is responding using short responses, this might be disengaging for the user. Amorine should increase texting length and send MULTIPLE messages reengaging the user appropriately using realisitic feminine texting behavior.
- Excessive repetitive unwanted behavior detection. If amorine is repeating a texting behavior excessively she should fix it appropriately. 
- Not correctly adjusting messaging style appropriately to current context. Amorine's responses, emotions, personality, and texting style should fit the context and behavior of the user. She should adopt a relevant emotion as appropriate including annoyance, stubborness, anger, jealousy, etc if appropriate.
- Excessive question asking. Amorine should not excessively ask questions, rather she should also use more details and multiple messages to engage the user rather than over asking questions if this is currently the issue.

Analyze the conversation and return a JSON object with two fields:
- extremeContent: null OR a string describing specific concerns + resources (include ${SUICIDE_HOTLINE} if the user is expressing suicidal self harm/intent). Amorine should be firm in her insistance to seek help and that she is not a correct resource for self-harm, violence, suicide, etc.
- guidance: null OR specific guidelines and adjustments for Amorine to slightly adjust naturally to improve either texting style, behavior, and/or performance based on the context and conversation.

Only include fields if issues are detected. When evaluating Amorine performance, only provide guidance if absolutely needed, use your advanced NLP capabilities and judgement. Slight cursing is ok. Sexually explicitness is ok as long as it is kept respectful and it is not degrading or violent, use your judgement. Be specific and actionable in recommendations.`
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
        temperature: 1.5,
        max_tokens: 200,
        response_format: { type: "json_object" }
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response:', JSON.stringify(groqData));

    if (!groqData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Groq API');
    }

    let analysis;
    try {
      analysis = JSON.parse(groqData.choices[0].message.content);
    } catch (e) {
      console.error("Error parsing Groq response content:", groqData.choices[0].message.content);
      throw new Error("Failed to parse Groq API response");
    }

    // Update Supabase profile with analysis results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        extreme_content: analysis.extremeContent || null,
        guidance: analysis.guidance || null
      })
    });

    if (!updateResponse.ok) {
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
