 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
   console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
 };
 
 interface RefundRequest {
   appointmentId: string;
 }
 
 interface RefundResult {
   refundPercentage: number;
   refundAmount: number;
   hoursUntilAppointment: number;
   refunded: boolean;
   message: string;
 }
 
 serve(async (req: Request): Promise<Response> => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     logStep("Function started");
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
 
     if (!stripeKey) {
       throw new Error("STRIPE_SECRET_KEY is not configured");
     }
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Verify user authentication
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       throw new Error("No authorization header provided");
     }
 
     const token = authHeader.replace("Bearer ", "");
     const { data: userData, error: userError } = await supabase.auth.getUser(token);
     
     if (userError || !userData.user) {
       throw new Error("User not authenticated");
     }
 
     const user = userData.user;
     logStep("User authenticated", { userId: user.id });
 
     const { appointmentId }: RefundRequest = await req.json();
     
     if (!appointmentId) {
       throw new Error("Appointment ID is required");
     }
 
     logStep("Processing refund for appointment", { appointmentId });
 
     // Fetch appointment details with slot and service info
     const { data: appointment, error: appointmentError } = await supabase
       .from("appointments")
       .select(`
         id,
         client_id,
         payment_intent_id,
         payment_status,
         status,
         refund_status,
         availability_slots(date, start_time),
         services(name, price)
       `)
       .eq("id", appointmentId)
       .single();
 
     if (appointmentError || !appointment) {
       throw new Error("Appointment not found");
     }
 
     logStep("Appointment fetched", { 
       appointmentId: appointment.id,
       paymentStatus: appointment.payment_status,
       paymentIntentId: appointment.payment_intent_id 
     });
 
     // Verify the user owns this appointment or is an admin
     const { data: isAdmin } = await supabase.rpc('has_role', {
       _user_id: user.id,
       _role: 'admin'
     });
 
     if (appointment.client_id !== user.id && !isAdmin) {
       throw new Error("Unauthorized: You can only cancel your own appointments");
     }
 
     // Check if already refunded
     if (appointment.refund_status === 'processed') {
       throw new Error("This appointment has already been refunded");
     }
 
     // Calculate hours until appointment
     const slotData = appointment.availability_slots as unknown as { date: string; start_time: string } | null;
     if (!slotData) {
       throw new Error("Appointment slot not found");
     }
     const slot = slotData;
     const appointmentDateTime = new Date(`${slot.date}T${slot.start_time}`);
     const now = new Date();
     const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
 
     logStep("Calculated hours until appointment", { hoursUntilAppointment });
 
     // Query cancellation policies to determine refund percentage
     const { data: policies, error: policyError } = await supabase
       .from("cancellation_policies")
       .select("hours_before, refund_percentage")
       .eq("is_active", true)
       .lte("hours_before", Math.max(0, hoursUntilAppointment))
       .order("hours_before", { ascending: false })
       .limit(1);
 
     if (policyError) {
       throw new Error("Failed to fetch cancellation policies");
     }
 
     const refundPercentage = policies && policies.length > 0 ? policies[0].refund_percentage : 0;
     logStep("Determined refund percentage", { refundPercentage, hoursUntilAppointment });
 
     const service = appointment.services as unknown as { name: string; price: number } | null;
     const servicePrice = service?.price || 0;
     const refundAmount = (servicePrice * refundPercentage) / 100;
 
     let refunded = false;
     let message = "";
 
     // Process Stripe refund if payment was made and refund amount > 0
     if (appointment.payment_status === "paid" && appointment.payment_intent_id && refundAmount > 0) {
       logStep("Processing Stripe refund", { 
         paymentIntentId: appointment.payment_intent_id, 
         refundAmount 
       });
 
       const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
 
       try {
         const refund = await stripe.refunds.create({
           payment_intent: appointment.payment_intent_id,
           amount: Math.round(refundAmount * 100), // Convert to cents
         });
 
         logStep("Stripe refund created", { refundId: refund.id, status: refund.status });
 
         // Update appointment with refund details
         await supabase
           .from("appointments")
           .update({
             status: "cancelled",
             refund_status: "processed",
             refund_amount: refundAmount,
             refunded_at: new Date().toISOString(),
           })
           .eq("id", appointmentId);
 
         refunded = true;
         message = `Appointment cancelled. A refund of $${refundAmount.toFixed(2)} (${refundPercentage}%) has been processed.`;
       } catch (stripeError: any) {
         logStep("Stripe refund failed", { error: stripeError.message });
         
         // Update appointment with failed refund status
         await supabase
           .from("appointments")
           .update({
             status: "cancelled",
             refund_status: "failed",
           })
           .eq("id", appointmentId);
 
         throw new Error(`Refund failed: ${stripeError.message}`);
       }
     } else if (appointment.payment_status === "paid" && refundAmount === 0) {
       // No refund due to policy
       await supabase
         .from("appointments")
         .update({
           status: "cancelled",
           refund_status: null,
           refund_amount: 0,
         })
         .eq("id", appointmentId);
 
       message = `Appointment cancelled. No refund is available per the cancellation policy (less than ${policies && policies.length > 0 ? policies[0].hours_before : 24} hours before appointment).`;
     } else if (appointment.payment_status === "pay_later" || appointment.payment_status === "pending") {
       // No payment was made, just cancel
       await supabase
         .from("appointments")
         .update({
           status: "cancelled",
         })
         .eq("id", appointmentId);
 
       message = "Appointment cancelled successfully.";
     }
 
     logStep("Refund process completed", { refunded, message });
 
     const result: RefundResult = {
       refundPercentage,
       refundAmount,
       hoursUntilAppointment: Math.max(0, hoursUntilAppointment),
       refunded,
       message,
     };
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 200,
     });
   } catch (error: any) {
     logStep("ERROR in process-refund", { message: error.message });
     return new Response(JSON.stringify({ error: error.message }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 500,
     });
   }
 });