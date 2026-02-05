import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SERVICE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Get request body
    const { appointmentId, serviceName, servicePrice, returnUrl } = await req.json();
    logStep("Request body received", { appointmentId, serviceName, servicePrice });

    if (!appointmentId || !serviceName || !servicePrice) {
      throw new Error("Missing required fields: appointmentId, serviceName, servicePrice");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Security: ensure the appointment belongs to this user
    const { data: appt, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("id, client_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptError || !appt) {
      logStep("Appointment not found", { error: apptError });
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (appt.client_id !== user.id) {
      logStep("Forbidden: appointment does not belong to user", { appointmentId, userId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Convert price to cents (Stripe uses smallest currency unit)
    const priceInCents = Math.round(parseFloat(servicePrice) * 100);
    logStep("Price converted", { priceInCents });

    // Create a one-time payment session using price_data for dynamic pricing
    const origin = req.headers.get("origin") || returnUrl || "http://localhost:5173";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: serviceName,
              description: `Beauty service appointment`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?appointment_id=${appointmentId}`,
      cancel_url: `${origin}/payment-cancelled?appointment_id=${appointmentId}`,
      metadata: {
        appointment_id: appointmentId,
        user_id: user.id,
      },
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update appointment with stripe session ID (service role to avoid RLS issues)
    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        stripe_session_id: session.id,
        payment_status: "pending",
      })
      .eq("id", appointmentId);

    if (updateError) {
      logStep("Failed to update appointment with session ID", { error: updateError });
      throw new Error(`Failed to persist Stripe session id: ${updateError.message}`);
    }

    logStep("Appointment updated with session ID", { appointmentId, sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
