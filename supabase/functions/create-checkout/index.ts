
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the user ID from the request
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Missing user ID')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get or create Stripe customer
    let { data: customerData } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()

    let stripeCustomerId: string

    if (!customerData?.stripe_customer_id) {
      // Get user email from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      if (!userData.user?.email) {
        throw new Error('User email not found')
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          supabase_uid: userId,
        },
      })

      // Store customer ID in our database
      await supabase.from('stripe_customers').insert({
        id: userId,
        stripe_customer_id: customer.id,
      })

      stripeCustomerId = customer.id
    } else {
      stripeCustomerId = customerData.stripe_customer_id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: 'price_1QsXUbLJ4syn1yPLyigBrVGd',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/chat?success=true`,
      cancel_url: `${req.headers.get('origin')}/settings?canceled=true`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
