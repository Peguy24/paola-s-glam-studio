import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  appointmentId: string;
  newStatus: string;
  previousStatus?: string;
}

// Twilio SMS helper function
async function sendSMS(to: string, body: string, twilioAccountSid: string, twilioAuthToken: string, twilioPhoneNumber: string) {
  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: twilioPhoneNumber,
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio SMS error:', error);
      return { success: false, error };
    }

    const data = await response.json();
    console.log('SMS sent successfully:', data.sid);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token and check admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Admin role check failed:', roleError || 'User is not an admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.email} authorized for notify-appointment-status`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const smsEnabled = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);

    if (smsEnabled) {
      console.log("SMS notifications enabled via Twilio");
    } else {
      console.log("SMS notifications disabled (Twilio credentials not configured)");
    }

    const { appointmentId, newStatus, previousStatus }: StatusNotificationRequest = await req.json();

    console.log(`Processing status change notification: ${previousStatus || 'unknown'} -> ${newStatus} for appointment ${appointmentId}`);

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        status,
        client_id,
        slot:availability_slots(date, start_time, end_time),
        profile:profiles!appointments_client_id_fkey(email, full_name, phone),
        service:services(name, price)
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('Appointment fetch error:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientEmail = appointment.profile?.email;
    const clientPhone = appointment.profile?.phone;
    const clientName = appointment.profile?.full_name || "Valued Client";
    const slot = appointment.slot;
    const serviceName = appointment.service?.name || appointment.service_type;

    if (!clientEmail) {
      console.error(`No email found for appointment ${appointment.id}`);
      return new Response(
        JSON.stringify({ error: 'Client email not found' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let htmlContent = "";
    let smsBody = "";
    let changeType = newStatus;

    // Generate notification content based on status
    if (newStatus === "confirmed") {
      subject = "Appointment Confirmed - Paola Beauty Glam";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Appointment Confirmed!</h1>
          <p>Dear ${clientName},</p>
          <p>Great news! Your appointment has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${slot.date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</p>
          </div>
          <p>We look forward to seeing you!</p>
          <p>Best regards,<br><strong>Paola Beauty Glam Team</strong></p>
        </div>
      `;
      smsBody = `Paola Beauty Glam: Your appointment for ${serviceName} on ${slot.date} at ${slot.start_time.slice(0, 5)} has been CONFIRMED. See you soon!`;
    } else if (newStatus === "pending") {
      subject = "Appointment Pending - Paola Beauty Glam";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Appointment Pending</h1>
          <p>Dear ${clientName},</p>
          <p>Your appointment is pending confirmation. We'll notify you once it's confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #eab308;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${slot.date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</p>
          </div>
          <p>Thank you for your patience.</p>
          <p>Best regards,<br><strong>Paola Beauty Glam Team</strong></p>
        </div>
      `;
      smsBody = `Paola Beauty Glam: Your appointment for ${serviceName} on ${slot.date} at ${slot.start_time.slice(0, 5)} is PENDING confirmation. We'll notify you soon!`;
    } else if (newStatus === "cancelled") {
      subject = "Appointment Cancelled - Paola Beauty Glam";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Appointment Cancelled</h1>
          <p>Dear ${clientName},</p>
          <p>We regret to inform you that your appointment has been cancelled.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${slot.date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</p>
          </div>
          <p>Please contact us if you'd like to reschedule.</p>
          <p>We apologize for any inconvenience.</p>
          <p>Best regards,<br><strong>Paola Beauty Glam Team</strong></p>
        </div>
      `;
      smsBody = `Paola Beauty Glam: Your appointment for ${serviceName} on ${slot.date} at ${slot.start_time.slice(0, 5)} has been CANCELLED. Contact us to reschedule.`;
    } else if (newStatus === "completed") {
      subject = "Appointment Completed - Thank You! - Paola Beauty Glam";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Thank You for Visiting!</h1>
          <p>Dear ${clientName},</p>
          <p>Thank you for choosing Paola Beauty Glam! We hope you loved your experience.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${slot.date}</p>
          </div>
          <p>We'd love to hear your feedback! Please leave a review to help others discover our services.</p>
          <p>See you next time!</p>
          <p>Best regards,<br><strong>Paola Beauty Glam Team</strong></p>
        </div>
      `;
      smsBody = `Paola Beauty Glam: Thank you for visiting us! Your ${serviceName} appointment has been completed. We'd love your feedback!`;
    } else {
      console.log(`No notification template for status: ${newStatus}`);
      return new Response(
        JSON.stringify({ message: `No notification sent for status: ${newStatus}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let emailSuccess = false;
    let smsSuccess = false;
    let emailError = null;
    let smsError = null;

    // Send email
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Paola Beauty Glam <notifications@paola-beautyglam.com>",
          to: [clientEmail],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        emailError = errorData;
        console.error(`Failed to send email to ${clientEmail}:`, errorData);
      } else {
        emailSuccess = true;
        console.log(`Email sent to ${clientEmail} for status: ${newStatus}`);
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : String(error);
      console.error(`Failed to send email to ${clientEmail}:`, error);
    }

    // Send SMS if Twilio is configured and client has a phone number
    if (smsEnabled && clientPhone) {
      const smsResult = await sendSMS(
        clientPhone,
        smsBody,
        twilioAccountSid!,
        twilioAuthToken!,
        twilioPhoneNumber!
      );
      
      if (smsResult.success) {
        smsSuccess = true;
        console.log(`SMS sent to ${clientPhone} for status: ${newStatus}`);
      } else {
        smsError = smsResult.error;
        console.error(`Failed to send SMS to ${clientPhone}:`, smsResult.error);
      }
    } else if (!smsEnabled) {
      console.log(`SMS disabled - Twilio not configured`);
    } else if (!clientPhone) {
      console.log(`No phone number for client`);
    }

    // Log notification to history
    const notificationType = emailSuccess && smsSuccess ? 'both' : emailSuccess ? 'email' : smsSuccess ? 'sms' : 'email';
    const status = (emailSuccess || smsSuccess) ? 'sent' : 'failed';
    const errorMessage = emailError || smsError ? `Email: ${emailError || 'N/A'}, SMS: ${smsError || 'N/A'}` : null;

    await supabase.from('notification_history').insert({
      appointment_id: appointmentId,
      recipient_email: clientEmail,
      recipient_phone: clientPhone,
      notification_type: notificationType,
      change_type: changeType,
      status: status,
      error_message: errorMessage,
      metadata: {
        service_name: serviceName,
        appointment_date: slot.date,
        appointment_time: `${slot.start_time} - ${slot.end_time}`,
        previous_status: previousStatus,
        new_status: newStatus,
      }
    });

    return new Response(
      JSON.stringify({ 
        message: `Notification sent for status: ${newStatus}`,
        emailSent: emailSuccess,
        smsSent: smsSuccess
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in notify-appointment-status function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
