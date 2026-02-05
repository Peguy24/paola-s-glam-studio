import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-CONFIRMATION] ${step}${detailsStr}`);
};

const ADMIN_EMAIL = "paolabeautyglam@gmail.com";
const FROM_EMAIL = "Paola Beauty Glam <notifications@paola-beautyglam.com>";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendKey);

    // Create Supabase client with service role for reading appointment data
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { appointmentId } = await req.json();
    if (!appointmentId) throw new Error("Missing appointmentId");
    logStep("Received appointmentId", { appointmentId });

    // Fetch appointment details with related data
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from("appointments")
      .select(`
        *,
        profiles:client_id (email, full_name, phone),
        services:service_id (name, price, category),
        availability_slots:slot_id (date, start_time, end_time)
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error(`Failed to fetch appointment: ${appointmentError?.message || "Not found"}`);
    }
    logStep("Appointment fetched", { appointment });

    const clientEmail = appointment.profiles?.email;
    const clientName = appointment.profiles?.full_name || "Valued Customer";
    const clientPhone = appointment.profiles?.phone || "Not provided";
    const serviceName = appointment.services?.name || appointment.service_type;
    const servicePrice = appointment.services?.price || 0;
    const serviceCategory = appointment.services?.category || "Beauty";
    const appointmentDate = appointment.availability_slots?.date || "TBD";
    const startTime = appointment.availability_slots?.start_time?.slice(0, 5) || "TBD";
    const endTime = appointment.availability_slots?.end_time?.slice(0, 5) || "";

    if (!clientEmail) {
      throw new Error("Client email not found");
    }

    // Format date nicely
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Email to Client
    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f5f2;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✨ Payment Confirmed! ✨</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your booking is confirmed</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Dear <strong>${clientName}</strong>,
            </p>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Thank you for your payment! Your appointment has been confirmed and we look forward to seeing you.
            </p>
            
            <div style="background-color: #faf7f4; border-left: 4px solid #d4a574; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📋 Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Service:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${serviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Category:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${serviceCategory}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Time:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${startTime}${endTime ? ` - ${endTime}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #2e7d32; font-size: 16px; font-weight: bold;">$${servicePrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-size: 14px; font-weight: 600;">
                ✅ Payment Status: CONFIRMED
              </p>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              If you need to make any changes to your appointment, please contact us at least 24 hours in advance.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 13px; margin: 0;">
                Paola Beauty Glam<br>
                <em>Your Beauty, Our Passion</em>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email to Admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">💰 New Payment Received!</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: #e8f5e9; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-size: 24px; font-weight: bold;">
                $${servicePrice.toFixed(2)}
              </p>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Payment Confirmed</p>
            </div>
            
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">👤 Client Information</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Name:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px;">${clientEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Phone:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px;">${clientPhone}</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">📅 Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Service:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Category:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px;">${serviceCategory}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Time:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600;">${startTime}${endTime ? ` - ${endTime}` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Appointment ID:</td>
                <td style="padding: 8px 0; color: #888; font-size: 12px; font-family: monospace;">${appointmentId}</td>
              </tr>
            </table>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                This is an automated notification from Paola Beauty Glam
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to client
    logStep("Sending email to client", { clientEmail });
    const { error: clientEmailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [clientEmail],
      subject: "✨ Payment Confirmed - Your Appointment is Booked!",
      html: clientEmailHtml,
    });

    if (clientEmailError) {
      logStep("Failed to send client email", { error: clientEmailError });
    } else {
      logStep("Client email sent successfully");
    }

    // Send email to admin
    logStep("Sending email to admin", { adminEmail: ADMIN_EMAIL });
    const { error: adminEmailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `💰 New Payment: $${servicePrice.toFixed(2)} - ${clientName}`,
      html: adminEmailHtml,
    });

    if (adminEmailError) {
      logStep("Failed to send admin email", { error: adminEmailError });
    } else {
      logStep("Admin email sent successfully");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientEmailSent: !clientEmailError,
        adminEmailSent: !adminEmailError
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
