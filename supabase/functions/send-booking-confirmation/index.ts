import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  appointmentId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { appointmentId }: BookingConfirmationRequest = await req.json();

    console.log("Sending booking confirmation for appointment:", appointmentId);

    // Fetch appointment details with related data
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        notes,
        status,
        created_at,
        profiles!appointments_client_id_fkey (
          email,
          full_name,
          phone
        ),
        availability_slots!appointments_slot_id_fkey (
          date,
          start_time,
          end_time
        ),
        services!appointments_service_id_fkey (
          name,
          price,
          description
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error("Error fetching appointment:", fetchError);
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profile = appointment.profiles as any;
    const slot = appointment.availability_slots as any;
    const service = appointment.services as any;

    if (!profile?.email) {
      console.error("No email found for customer");
      return new Response(
        JSON.stringify({ error: "Customer email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the appointment date
    const appointmentDate = new Date(slot.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const customerName = profile.full_name || "Valued Customer";
    const serviceName = service?.name || appointment.service_type;
    const servicePrice = service?.price ? `$${service.price.toFixed(2)}` : "";

    // Send confirmation email to customer
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f4f0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #d4a574 0%, #c4956a 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Paola Beauty Glam</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your beauty transformation awaits</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2d2d2d; margin: 0 0 20px 0; font-size: 24px;">Booking Confirmed! ✨</h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
              Hello ${customerName},
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for booking with us! We're excited to see you. Here are your appointment details:
            </p>
            
            <!-- Appointment Details Box -->
            <div style="background-color: #faf7f4; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #d4a574;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px; width: 100px;">Service</td>
                  <td style="padding: 8px 0; color: #2d2d2d; font-size: 16px; font-weight: 500;">${serviceName} ${servicePrice ? `<span style="color: #d4a574;">(${servicePrice})</span>` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Date</td>
                  <td style="padding: 8px 0; color: #2d2d2d; font-size: 16px; font-weight: 500;">${appointmentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Time</td>
                  <td style="padding: 8px 0; color: #2d2d2d; font-size: 16px; font-weight: 500;">${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Status</td>
                  <td style="padding: 8px 0;">
                    <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">Pending Confirmation</span>
                  </td>
                </tr>
                ${appointment.notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px; vertical-align: top;">Notes</td>
                  <td style="padding: 8px 0; color: #2d2d2d; font-size: 14px;">${appointment.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              📧 You'll receive another email once your appointment is confirmed by our team.
            </p>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
              If you need to cancel or reschedule, please contact us as soon as possible.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0;">
              We look forward to seeing you!<br>
              <strong style="color: #d4a574;">— The Paola Beauty Glam Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #2d2d2d; padding: 25px 30px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} Paola Beauty Glam. All rights reserved.
            </p>
            <p style="color: #666; font-size: 11px; margin: 0;">
              This email was sent to ${profile.email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: "Paola Beauty Glam <onboarding@resend.dev>",
      to: [profile.email],
      subject: `Booking Confirmed - ${serviceName} on ${appointmentDate}`,
      html: emailHtml,
    });

    console.log("Confirmation email sent to customer:", emailResult);

    // Log the notification
    await supabase.from("notification_history").insert({
      appointment_id: appointmentId,
      notification_type: "email",
      change_type: "booking_confirmation",
      recipient_email: profile.email,
      status: "sent",
      metadata: {
        service: serviceName,
        date: appointmentDate,
        time: `${slot.start_time} - ${slot.end_time}`,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking confirmation sent",
        email: profile.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
