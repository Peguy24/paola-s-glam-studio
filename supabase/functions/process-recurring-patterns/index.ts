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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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