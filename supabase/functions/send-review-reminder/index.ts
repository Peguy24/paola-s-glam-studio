import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReviewReminderRequest {
  appointmentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Note: If RESEND_API_KEY is not configured, the function will still log
    // the reminder attempt but won't send an actual email. Add the API key
    // in your project secrets to enable email sending.
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - review reminder email not sent");
      return new Response(
        JSON.stringify({ 
          message: "Review reminder logged (email sending disabled - add RESEND_API_KEY to enable)" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { appointmentId }: ReviewReminderRequest = await req.json();

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        status,
        slot:availability_slots(date, start_time, end_time),
        service:services(name),
        profile:profiles!appointments_client_id_fkey(email, full_name)
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error("Appointment not found");
    }

    // Check if already rated
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (existingRating) {
      console.log(`Appointment ${appointmentId} already has a rating - skipping reminder`);
      return new Response(
        JSON.stringify({ message: "Appointment already rated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const clientEmail = appointment.profile?.email;
    const clientName = appointment.profile?.full_name || "Valued Client";
    const serviceName = appointment.service?.name || appointment.service_type;
    const appointmentDate = appointment.slot.date;

    if (!clientEmail) {
      throw new Error("Client email not found");
    }

    const subject = "How was your experience? - Paola Beauty Glam";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Thank You for Choosing Paola Beauty Glam!</h1>
        <p>Dear ${clientName},</p>
        <p>We hope you loved your recent appointment with us!</p>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
        </div>
        <p>Your feedback means the world to us! We'd love to hear about your experience.</p>
        <p style="margin: 30px 0;">
          <a href="${Deno.env.get("VITE_SUPABASE_URL")?.replace('/rest/v1', '')}/profile" 
             style="background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Leave a Review
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Visit your profile to rate your service and share your thoughts. 
          Your review helps us improve and helps others discover our services!
        </p>
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Paola Beauty Glam Team</strong>
        </p>
      </div>
    `;

    let emailSuccess = false;
    let emailError = null;

    // Send email
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Paola Beauty Glam <onboarding@resend.dev>",
          to: [clientEmail],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        emailError = errorData;
        console.error(`Failed to send review reminder to ${clientEmail}:`, errorData);
      } else {
        emailSuccess = true;
        console.log(`Review reminder sent to ${clientEmail} for appointment ${appointmentId}`);
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : String(error);
      console.error(`Failed to send review reminder to ${clientEmail}:`, error);
    }

    // Log notification to history
    await supabase.from('notification_history').insert({
      appointment_id: appointmentId,
      recipient_email: clientEmail,
      notification_type: 'email',
      change_type: 'review_reminder',
      status: emailSuccess ? 'sent' : 'failed',
      error_message: emailError,
      metadata: {
        service_type: appointment.service_type,
        appointment_date: appointmentDate,
      }
    });

    return new Response(
      JSON.stringify({ 
        message: emailSuccess 
          ? "Review reminder sent successfully" 
          : "Failed to send review reminder" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: emailSuccess ? 200 : 500 
      }
    );
  } catch (error: any) {
    console.error("Error in send-review-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
