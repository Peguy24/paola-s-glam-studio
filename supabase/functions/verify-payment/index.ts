 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     logStep("Function started");
 
     const { appointmentId } = await req.json();
     if (!appointmentId) {
       throw new Error("Missing appointmentId");
     }
     logStep("Received appointmentId", { appointmentId });
 
     const supabaseClient = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { auth: { persistSession: false } }
     );
 
     // Get the appointment with its stripe_session_id
     const { data: appointment, error: fetchError } = await supabaseClient
       .from("appointments")
       .select("id, stripe_session_id, payment_status, payment_intent_id")
       .eq("id", appointmentId)
       .maybeSingle();
 
     if (fetchError || !appointment) {
       logStep("Appointment not found", { error: fetchError });
       throw new Error("Appointment not found");
     }
 
     logStep("Found appointment", { appointment });
 
     // If already paid, no need to verify
     if (appointment.payment_status === "paid") {
       logStep("Already marked as paid");
       return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       });
     }
 
     // If no stripe session, check if it was a pay_later appointment
     if (!appointment.stripe_session_id) {
       logStep("No stripe session - might be pay_later or direct booking");
       return new Response(JSON.stringify({ success: true, noSession: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       });
     }
 
     // Verify with Stripe
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
 
     const stripe = new Stripe(stripeKey, {
       apiVersion: "2025-08-27.basil",
     });
 
     const session = await stripe.checkout.sessions.retrieve(appointment.stripe_session_id);
     logStep("Retrieved Stripe session", { 
       sessionId: session.id, 
       paymentStatus: session.payment_status,
       paymentIntent: session.payment_intent
     });
 
     if (session.payment_status === "paid") {
       // Update the appointment
       const { error: updateError } = await supabaseClient
         .from("appointments")
         .update({
           payment_status: "paid",
           payment_intent_id: typeof session.payment_intent === 'string'
             ? session.payment_intent
             : session.payment_intent?.id || null,
           status: "confirmed"
         })
         .eq("id", appointmentId);
 
       if (updateError) {
         logStep("Failed to update appointment", { error: updateError });
         throw new Error("Failed to update payment status");
       }
 
       logStep("Payment verified and appointment updated to paid");
 
       // Send payment confirmation emails
       try {
         const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
         await fetch(`${supabaseUrl}/functions/v1/send-payment-confirmation`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
           },
           body: JSON.stringify({ appointmentId }),
         });
         logStep("Payment confirmation triggered");
       } catch (emailErr) {
         logStep("Email notification error", { error: String(emailErr) });
       }
 
       return new Response(JSON.stringify({ success: true, verified: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       });
     }
 
     logStep("Payment not completed in Stripe", { status: session.payment_status });
     return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
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