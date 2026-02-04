import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request authorization
    // This function is designed to be called by Supabase scheduler or by admins
    const authHeader = req.headers.get('Authorization');
    const schedulerHeader = req.headers.get('X-Supabase-Scheduler');
    
    // If called via scheduler, verify the scheduler header exists
    // If called manually, require admin authentication
    if (!schedulerHeader) {
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('No authorization header provided and not called by scheduler');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: No authorization header' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify admin role for manual calls
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await authClient.auth.getUser(token);
      
      if (authError || !userData?.user) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin'
      });

      if (roleError || !isAdmin) {
        console.error('Admin role check failed:', roleError || 'User is not an admin');
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Admin ${userData.user.email} authorized for send-appointment-reminders`);
    } else {
      console.log('Function called by Supabase scheduler');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Calculate the time window (24 hours from now, with 1 hour buffer)
    const now = new Date();
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log("Checking for appointments between:", reminderStart, "and", reminderEnd);

    // Fetch appointments that need reminders
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        notes,
        status,
        client_id,
        profiles!appointments_client_id_fkey (
          email,
          full_name
        ),
        availability_slots!appointments_slot_id_fkey (
          date,
          start_time,
          end_time
        )
      `)
      .eq("reminder_sent", false)
      .in("status", ["pending", "confirmed"])
      .gte("availability_slots.date", reminderStart.toISOString().split("T")[0])
      .lte("availability_slots.date", reminderEnd.toISOString().split("T")[0]);

    if (fetchError) {
      console.error("Error fetching appointments:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${appointments?.length || 0} appointments to process`);

    let sentCount = 0;
    let errorCount = 0;

    // Send reminders for each appointment
    for (const appointment of appointments || []) {
      try {
        const profile = appointment.profiles as any;
        const slot = appointment.availability_slots as any;

        if (!profile?.email) {
          console.warn(`No email for appointment ${appointment.id}`);
          continue;
        }

        // Format the appointment details
        const appointmentDate = new Date(slot.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Appointment Reminder</h1>
            <p>Hello ${profile.full_name || "there"},</p>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Service:</strong> ${appointment.service_type}</p>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${slot.start_time} - ${slot.end_time}</p>
              ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ""}
            </div>
            <p>We look forward to seeing you!</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you need to cancel or reschedule, please contact us as soon as possible.
            </p>
          </div>
        `;

        // Send email via Resend
        const emailResult = await resend.emails.send({
          from: "Paola Beauty Glam <notifications@paola-beautyglam.com>",
          to: [profile.email],
          subject: "Reminder: Your Appointment Tomorrow",
          html: emailHtml,
        });

        console.log(`Email sent to ${profile.email}:`, emailResult);

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appointment.id);

        if (updateError) {
          console.error(`Error updating appointment ${appointment.id}:`, updateError);
          errorCount++;
        } else {
          sentCount++;
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Reminder job complete: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: appointments?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
