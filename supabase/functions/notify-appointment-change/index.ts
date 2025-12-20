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

    console.log(`Admin ${user.email} authorized for notify-appointment-change`);

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
        profile:profiles!appointments_client_id_fkey(email, full_name, phone)
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
      const clientPhone = appointment.profile?.phone;
      const clientName = appointment.profile?.full_name || "Valued Client";
      const originalSlot = appointment.slot;

      if (!clientEmail) {
        console.error(`No email found for appointment ${appointment.id}`);
        return;
      }

      let subject = "";
      let htmlContent = "";
      let smsBody = "";

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
        smsBody = `Paola Beauty Glam: Your ${appointment.service_type} appointment on ${originalSlot.date} at ${originalSlot.start_time} has been cancelled. Please contact us to reschedule.`;
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
        const newTimeInfo = newDate && newStartTime ? `${newDate} at ${newStartTime}` : 'a new time';
        smsBody = `Paola Beauty Glam: Your ${appointment.service_type} appointment has been rescheduled to ${newTimeInfo}. Original: ${originalSlot.date} at ${originalSlot.start_time}.`;
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
            from: "Paola Beauty Glam <onboarding@resend.dev>",
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
          console.log(`Email sent to ${clientEmail} for appointment ${appointment.id}`);
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
          console.log(`SMS sent to ${clientPhone} for appointment ${appointment.id}`);
        } else {
          smsError = smsResult.error;
          console.error(`Failed to send SMS to ${clientPhone}:`, smsResult.error);
        }
      } else if (!smsEnabled) {
        console.log(`SMS disabled for appointment ${appointment.id}`);
      } else if (!clientPhone) {
        console.log(`No phone number for appointment ${appointment.id}`);
      }

      // Log notification to history
      const notificationType = emailSuccess && smsSuccess ? 'both' : emailSuccess ? 'email' : smsSuccess ? 'sms' : 'email';
      const status = (emailSuccess || smsSuccess) ? 'sent' : 'failed';
      const errorMessage = emailError || smsError ? `Email: ${emailError || 'N/A'}, SMS: ${smsError || 'N/A'}` : null;

      await supabase.from('notification_history').insert({
        appointment_id: appointment.id,
        recipient_email: clientEmail,
        recipient_phone: clientPhone,
        notification_type: notificationType,
        change_type: changeType,
        status: status,
        error_message: errorMessage,
        metadata: {
          service_type: appointment.service_type,
          original_date: originalSlot.date,
          original_time: `${originalSlot.start_time} - ${originalSlot.end_time}`,
          new_date: newDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
        }
      });
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
