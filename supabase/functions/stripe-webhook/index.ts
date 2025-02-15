
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })
    
    // Get the signature from the header
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response('No signature found', { status: 400 })
    }

    // Get the raw body
    const body = await req.text()
    
    // Verify the webhook
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        
        console.log('Processing subscription event:', event.type)
        console.log('Customer ID:', customerId)
        
        // Get the user id from stripe_customers table
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        
        if (customerError) {
          console.error('Error fetching customer:', customerError)
          return new Response('Customer not found', { status: 404 })
        }

        console.log('Found user ID:', customerData.id)

        // Update the subscription by user_id
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tier: subscription.status === 'active' ? 'pro' : 'free',
            stripe_subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('user_id', customerData.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new Response('Error updating subscription', { status: 500 })
        }

        console.log('Successfully updated subscription for user:', customerData.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('Processing subscription deletion')
        console.log('Subscription ID:', subscription.id)
        
        // Update subscription to free tier
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            tier: 'free',
            stripe_subscription_id: null,
            current_period_end: null,
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return new Response('Error updating subscription', { status: 500 })
        }

        console.log('Successfully reverted subscription to free tier')
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
