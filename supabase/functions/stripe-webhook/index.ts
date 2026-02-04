import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe-signature header");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the raw body
    const body = await req.text();
    logStep("Received body length", { length: body.length });

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook verified", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          paymentStatus: session.payment_status,
          metadata: session.metadata 
        });

        if (session.payment_status === "paid") {
          const appointmentId = session.metadata?.appointment_id;
          
          if (appointmentId) {
            // Update appointment payment status
            const { error: updateError } = await supabaseClient
              .from("appointments")
              .update({ 
                payment_status: "paid",
                payment_intent_id: typeof session.payment_intent === 'string' 
                  ? session.payment_intent 
                  : session.payment_intent?.id || null
              })
              .eq("id", appointmentId);

            if (updateError) {
              logStep("Failed to update appointment", { error: updateError, appointmentId });
            } else {
              logStep("Appointment payment status updated to paid", { appointmentId });
              
              // Send payment confirmation emails
              try {
                const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
                const response = await fetch(`${supabaseUrl}/functions/v1/send-payment-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({ appointmentId }),
                });
                
                if (response.ok) {
                  logStep("Payment confirmation emails sent", { appointmentId });
                } else {
                  const errorText = await response.text();
                  logStep("Failed to send payment confirmation emails", { error: errorText });
                }
              } catch (emailError) {
                logStep("Error sending payment confirmation emails", { error: String(emailError) });
              }
            }
          } else {
            logStep("No appointment_id in session metadata");
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata 
        });

        // Also handle payment_intent.succeeded as a fallback
        const appointmentId = paymentIntent.metadata?.appointment_id;
        if (appointmentId) {
          const { error: updateError } = await supabaseClient
            .from("appointments")
            .update({ 
              payment_status: "paid",
              payment_intent_id: paymentIntent.id
            })
            .eq("id", appointmentId);

          if (updateError) {
            logStep("Failed to update appointment from payment_intent", { error: updateError });
          } else {
            logStep("Appointment updated from payment_intent.succeeded", { appointmentId });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session expired", { sessionId: session.id });
        
        // Optionally reset payment status if session expired without payment
        const appointmentId = session.metadata?.appointment_id;
        if (appointmentId) {
          const { error: updateError } = await supabaseClient
            .from("appointments")
            .update({ payment_status: "pending" })
            .eq("id", appointmentId)
            .eq("payment_status", "pending"); // Only update if still pending

          if (updateError) {
            logStep("Failed to update expired session appointment", { error: updateError });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
