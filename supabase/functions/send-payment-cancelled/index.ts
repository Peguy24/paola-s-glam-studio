import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Twilio from "https://esm.sh/twilio@4.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-CANCELLED] ${step}${detailsStr}`);
};

// Helper function to send SMS via Twilio
async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      logStep("Twilio credentials not configured");
      return false;
    }

    const client = Twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    logStep("SMS sent successfully", { sid: result.sid, to });
    return true;
  } catch (error) {
    logStep("Failed to send SMS", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendApiKey);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { appointmentId } = await req.json();
    logStep("Received appointmentId", { appointmentId });

    if (!appointmentId) {
      throw new Error("Missing appointmentId");
    }

    // Fetch appointment details with related data
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from("appointments")
      .select(`
        *,
        profiles:client_id(email, full_name, phone),
        services:service_id(name, price),
        availability_slots:slot_id(date, start_time, end_time)
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      logStep("Failed to fetch appointment", { error: appointmentError });
      throw new Error("Appointment not found");
    }

    logStep("Appointment fetched", { 
      clientEmail: appointment.profiles?.email,
      serviceName: appointment.services?.name 
    });

    const clientEmail = appointment.profiles?.email;
    const clientName = appointment.profiles?.full_name || "Valued Client";
    const serviceName = appointment.services?.name || appointment.service_type;
    const servicePrice = appointment.services?.price || 0;
    const appointmentDate = appointment.availability_slots?.date;
    const startTime = appointment.availability_slots?.start_time;

    // Format date for display
    const formattedDate = appointmentDate 
      ? new Date(appointmentDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : "Date not available";

    const formattedTime = startTime 
      ? startTime.substring(0, 5) 
      : "Time not available";

    // Send email to client
    if (clientEmail) {
      const clientEmailResult = await resend.emails.send({
        from: "Paola Beauty Glam <notifications@paola-beautyglam.com>",
        to: [clientEmail],
        subject: "Payment Cancelled - Paola Beauty Glam",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f4f0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #d4a574 0%, #c9967a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Payment Cancelled</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Paola Beauty Glam</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #333;">Dear ${clientName},</p>
                
                <p style="font-size: 16px; color: #333;">We noticed that your payment was not completed. Your booking is currently pending.</p>
                
                <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #e65100;">Appointment Details</h3>
                  <p style="margin: 5px 0; color: #333;"><strong>Service:</strong> ${serviceName}</p>
                  <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0; color: #333;"><strong>Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0; color: #333;"><strong>Price:</strong> $${servicePrice.toFixed(2)}</p>
                </div>
                
                <p style="font-size: 16px; color: #333;">To complete your booking, please visit our website and retry the payment. Your time slot is reserved but may be released if payment is not completed soon.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://paolas-glam-hub.lovable.app/appointments" style="background: linear-gradient(135deg, #d4a574 0%, #c9967a 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Complete Payment</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">If you have any questions or need assistance, please don't hesitate to contact us.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 14px; color: #999; text-align: center;">
                  Thank you for choosing Paola Beauty Glam<br>
                  <a href="https://paolas-glam-hub.lovable.app" style="color: #d4a574;">www.paola-beautyglam.com</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      logStep("Client email sent", { result: clientEmailResult });
    }

    // Send notification to admin
    const adminEmail = "paolalopez@paola-beautyglam.com";
    const adminEmailResult = await resend.emails.send({
      from: "Paola Beauty Glam <notifications@paola-beautyglam.com>",
      to: [adminEmail],
      subject: `⚠️ Payment Cancelled - ${serviceName} - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f4f0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Payment Cancelled</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Admin Notification</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; color: #333;">A payment was cancelled for the following appointment:</p>
              
              <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h3 style="margin: 0 0 15px 0; color: #e65100;">Appointment Details</h3>
                <p style="margin: 5px 0; color: #333;"><strong>Client:</strong> ${clientName}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${clientEmail || "N/A"}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Phone:</strong> ${appointment.profiles?.phone || "N/A"}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Service:</strong> ${serviceName}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Time:</strong> ${formattedTime}</p>
                <p style="margin: 5px 0; color: #333;"><strong>Price:</strong> $${servicePrice.toFixed(2)}</p>
              </div>
              
              <p style="font-size: 14px; color: #666;">The appointment is pending payment. You may want to follow up with the client.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://paolas-glam-hub.lovable.app/admin" style="background: linear-gradient(135deg, #d4a574 0%, #c9967a 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Admin Dashboard</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    logStep("Admin email sent", { result: adminEmailResult });

    // Send SMS to client if phone number is available
    const clientPhone = appointment.profiles?.phone;
    if (clientPhone) {
      const shortDate = appointmentDate 
        ? new Date(appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : "";
      
      const smsMessage = `Paola Beauty Glam: Your payment for ${serviceName} on ${shortDate} at ${formattedTime} was not completed. Please visit our website to retry. Questions? Contact us!`;
      
      await sendSMS(clientPhone, smsMessage);
    } else {
      logStep("No phone number available for SMS");
    }

    return new Response(JSON.stringify({ success: true }), {
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
