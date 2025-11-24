import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { z } from "zod";

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  bookings_count?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
}

const bookingSchema = z.object({
  notes: z
    .string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional()
    .or(z.literal("")),
});

const BookingCalendar = () => {
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (date) {
      fetchAvailableSlots();
    }
  }, [date]);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch services",
        variant: "destructive",
      });
      return;
    }

    setServices(data || []);
  };

  const fetchAvailableSlots = async () => {
    if (!date) return;

    const formattedDate = format(date, "yyyy-MM-dd");
    
    // Fetch slots
    const { data: slotsData, error: slotsError } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("date", formattedDate)
      .eq("is_available", true)
      .order("start_time");

    if (slotsError) {
      toast({
        title: "Error",
        description: "Failed to fetch available slots",
        variant: "destructive",
      });
      return;
    }

    if (!slotsData || slotsData.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // Count bookings for each slot
    const slotsWithCapacity = await Promise.all(
      slotsData.map(async (slot) => {
        const { count, error: countError } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("slot_id", slot.id)
          .neq("status", "cancelled");

        if (countError) {
          console.error("Error counting bookings:", countError);
          return { ...slot, bookings_count: 0 };
        }

        return { ...slot, bookings_count: count || 0 };
      })
    );

    // Filter out slots that are at capacity
    const availableSlotsFiltered = slotsWithCapacity.filter(
      (slot) => slot.bookings_count! < slot.capacity
    );

    setAvailableSlots(availableSlotsFiltered);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedServiceId) {
      toast({
        title: "Missing information",
        description: "Please select a time slot and service",
        variant: "destructive",
      });
      return;
    }

    // Validate notes input
    const validationResult = bookingSchema.safeParse({ notes });
    if (!validationResult.success) {
      toast({
        title: "Validation error",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to book an appointment",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Rate limiting: Check how many bookings the user has made in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentBookings, error: rateLimitError } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_id", user.id)
      .gte("created_at", oneHourAgo.toISOString());

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (recentBookings && recentBookings.length >= 5) {
      toast({
        title: "Rate limit exceeded",
        description: "You can only book up to 5 appointments per hour. Please try again later.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Cooldown period: Check if user recently cancelled an appointment
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const { data: recentCancellations, error: cooldownError } = await supabase
      .from("appointments")
      .select("updated_at, status")
      .eq("client_id", user.id)
      .eq("status", "cancelled")
      .gte("updated_at", fifteenMinutesAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(1);

    if (cooldownError) {
      console.error("Cooldown check error:", cooldownError);
    } else if (recentCancellations && recentCancellations.length > 0) {
      const lastCancellation = new Date(recentCancellations[0].updated_at);
      const cooldownEnds = new Date(lastCancellation.getTime() + 15 * 60 * 1000);
      const minutesRemaining = Math.ceil((cooldownEnds.getTime() - Date.now()) / (60 * 1000));
      
      toast({
        title: "Cooldown period active",
        description: `You recently cancelled an appointment. Please wait ${minutesRemaining} more ${minutesRemaining === 1 ? 'minute' : 'minutes'} before booking again.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const selectedService = services.find(s => s.id === selectedServiceId);

    const { error } = await supabase.from("appointments").insert({
      client_id: user.id,
      slot_id: selectedSlot,
      service_id: selectedServiceId,
      service_type: selectedService?.name || "",
      notes: notes || null,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your appointment has been booked!",
      });
      setSelectedSlot("");
      setSelectedServiceId("");
      setNotes("");
      fetchAvailableSlots();
    }

    setLoading(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose your preferred date</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            disabled={(date) => date < new Date()}
          />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Complete your appointment booking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{service.name}</span>
                      <span className="ml-4 text-muted-foreground">${service.price.toFixed(2)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {date && (
            <div className="space-y-2">
              <Label>Available Times</Label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots available for this date</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot) => {
                    const remaining = slot.capacity - (slot.bookings_count || 0);
                    return (
                      <Button
                        key={slot.id}
                        variant={selectedSlot === slot.id ? "default" : "outline"}
                        onClick={() => setSelectedSlot(slot.id)}
                        className="justify-start flex-col items-start h-auto py-2"
                      >
                        <div className="flex items-center w-full">
                          <Clock className="mr-2 h-4 w-4" />
                          {slot.start_time.slice(0, 5)}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {remaining} {remaining === 1 ? 'spot' : 'spots'} left
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 characters
            </p>
          </div>

          <Button
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedServiceId}
            className="w-full"
          >
            {loading ? "Booking..." : "Book Appointment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingCalendar;
