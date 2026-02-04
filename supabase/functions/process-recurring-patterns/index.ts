import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringPattern {
  id: string;
  created_by: string;
  name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  capacity: number;
  weeks_ahead: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate request authorization
    // This function can be called by Supabase scheduler or by admins
    const authHeader = req.headers.get('Authorization');
    const schedulerHeader = req.headers.get('X-Supabase-Scheduler');

    // If called via scheduler, allow through
    // If called manually, require admin authentication
    if (!schedulerHeader) {
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('No authorization header provided and not called by scheduler');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user token and check admin role
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await authClient.auth.getUser(token);

      if (authError || !userData?.user) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check admin role using service client
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin'
      });

      if (roleError || !isAdmin) {
        console.error('Admin role check failed:', roleError || 'User is not an admin');
        return new Response(
          JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${userData.user.email} authorized for process-recurring-patterns`);
    } else {
      console.log('Function called by Supabase scheduler');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting recurring patterns processing...');

    // Fetch all active recurring patterns
    const { data: patterns, error: patternsError } = await supabase
      .from('recurring_patterns')
      .select('*')
      .eq('is_active', true);

    if (patternsError) {
      throw patternsError;
    }

    if (!patterns || patterns.length === 0) {
      console.log('No active patterns found');
      return new Response(
        JSON.stringify({ message: 'No active patterns found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${patterns.length} active patterns`);

    let totalCreated = 0;

    for (const pattern of patterns as RecurringPattern[]) {
      console.log(`Processing pattern: ${pattern.name}`);

      // Generate dates for the next N weeks
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + (pattern.weeks_ahead * 7));

      const slotsToCreate = [];

      // Iterate through each day until end date
      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
        
        // Check if this day is in the pattern's days_of_week
        if (pattern.days_of_week.includes(dayOfWeek)) {
          const dateStr = d.toISOString().split('T')[0];

          // Check if slot already exists for this date and time
          const { data: existingSlot, error: checkError } = await supabase
            .from('availability_slots')
            .select('id')
            .eq('date', dateStr)
            .eq('start_time', pattern.start_time)
            .eq('end_time', pattern.end_time)
            .maybeSingle();

          if (checkError) {
            console.error(`Error checking existing slot: ${checkError.message}`);
            continue;
          }

          // Only create if slot doesn't exist
          if (!existingSlot) {
            slotsToCreate.push({
              date: dateStr,
              start_time: pattern.start_time,
              end_time: pattern.end_time,
              capacity: pattern.capacity,
              created_by: pattern.created_by,
              is_available: true,
            });
          }
        }
      }

      // Batch insert all slots for this pattern
      if (slotsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('availability_slots')
          .insert(slotsToCreate);

        if (insertError) {
          console.error(`Error creating slots for pattern ${pattern.name}: ${insertError.message}`);
        } else {
          console.log(`Created ${slotsToCreate.length} slots for pattern: ${pattern.name}`);
          totalCreated += slotsToCreate.length;
        }
      } else {
        console.log(`No new slots needed for pattern: ${pattern.name}`);
      }
    }

    console.log(`Completed! Total slots created: ${totalCreated}`);

    return new Response(
      JSON.stringify({ 
        message: 'Recurring patterns processed successfully', 
        patterns_processed: patterns.length,
        slots_created: totalCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error processing recurring patterns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});