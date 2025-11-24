import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  slotId: string;
  changeType: "modified" | "cancelled";
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { slotId, changeType, newDate, newStartTime, newEndTime }: NotificationRequest = await req.json();

    // Fetch appointments for this slot
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        status,
        client_id,
        slot:availability_slots(date, start_time, end_time),
        profile:profiles!appointments_client_id_fkey(email, full_name)
      `)
      .eq("slot_id", slotId)
      .in("status", ["pending", "confirmed"]);

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const emailPromises = appointments.map(async (appointment: any) => {
      const clientEmail = appointment.profile?.email;
      const clientName = appointment.profile?.full_name || "Valued Client";
      const originalSlot = appointment.slot;

      if (!clientEmail) {
        console.error(`No email found for appointment ${appointment.id}`);
        return;
      }

      let subject = "";
      let htmlContent = "";

      if (changeType === "cancelled") {
        subject = "Appointment Cancelled - Paola Beauty Glam";
        htmlContent = `
          <h1>Appointment Cancellation Notice</h1>
          <p>Dear ${clientName},</p>
          <p>We regret to inform you that your appointment has been cancelled:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Service:</strong> ${appointment.service_type}</p>
            <p><strong>Original Date:</strong> ${originalSlot.date}</p>
            <p><strong>Original Time:</strong> ${originalSlot.start_time} - ${originalSlot.end_time}</p>
          </div>
          <p>Please contact us to reschedule your appointment at your convenience.</p>
          <p>We apologize for any inconvenience this may cause.</p>
          <p>Best regards,<br>Paola Beauty Glam Team</p>
        `;
      } else {
        subject = "Appointment Time Modified - Paola Beauty Glam";
        htmlContent = `
          <h1>Appointment Time Change Notice</h1>
          <p>Dear ${clientName},</p>
          <p>Your appointment time has been modified:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Service:</strong> ${appointment.service_type}</p>
            <h3>Original Time:</h3>
            <p><strong>Date:</strong> ${originalSlot.date}</p>
            <p><strong>Time:</strong> ${originalSlot.start_time} - ${originalSlot.end_time}</p>
            ${newDate && newStartTime && newEndTime ? `
              <h3>New Time:</h3>
              <p><strong>Date:</strong> ${newDate}</p>
              <p><strong>Time:</strong> ${newStartTime} - ${newEndTime}</p>
            ` : ''}
          </div>
          <p>If this new time doesn't work for you, please contact us to reschedule.</p>
          <p>Best regards,<br>Paola Beauty Glam Team</p>
        `;
      }

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
          console.error(`Failed to send email to ${clientEmail}:`, errorData);
        } else {
          console.log(`Email sent to ${clientEmail} for appointment ${appointment.id}`);
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${clientEmail}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ message: `Notifications sent to ${appointments.length} client(s)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in notify-appointment-change function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
