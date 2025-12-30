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
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

    const { data: appointmentData, error } = await supabase.from("appointments").insert({
      client_id: user.id,
      slot_id: selectedSlot,
      service_id: selectedServiceId,
      service_type: selectedService?.name || "",
      notes: notes || null,
      status: "pending",
    }).select("id").single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Send booking confirmation email to customer
      try {
        await supabase.functions.invoke("send-booking-confirmation", {
          body: { appointmentId: appointmentData.id },
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't show error to user, booking was still successful
      }

      toast({
        title: "Success",
        description: "Your appointment has been booked! Check your email for confirmation.",
      });
      setSelectedSlot("");
      setSelectedServiceId("");
      setNotes("");
      setDrawerOpen(false);
      fetchAvailableSlots();
    }

    setLoading(false);
  };

  // Booking details content (reusable for both card and drawer)
  const BookingDetailsContent = () => (
    <>
      <div className="space-y-2">
        <Label className="text-sm sm:text-base">Service</Label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="text-sm sm:text-base">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id} className="text-sm sm:text-base">
                <div className="flex justify-between items-center w-full gap-2">
                  <span className="truncate">{service.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">${service.price.toFixed(2)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {date && (
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Available Times</Label>
          {availableSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available for this date</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {availableSlots.map((slot) => {
                const remaining = slot.capacity - (slot.bookings_count || 0);
                return (
                  <Button
                    key={slot.id}
                    variant={selectedSlot === slot.id ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot.id)}
                    className="justify-start flex-col items-start h-auto py-3 px-4 sm:py-2 sm:px-3 min-h-[56px] sm:min-h-0"
                  >
                    <div className="flex items-center w-full">
                      <Clock className="mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="text-base sm:text-base font-medium">{slot.start_time.slice(0, 5)}</span>
                    </div>
                    <span className="text-xs sm:text-xs text-muted-foreground mt-1">
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
        <Label htmlFor="notes" className="text-sm sm:text-base">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any special requests or information..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          className="text-sm sm:text-base resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {notes.length}/500 characters
        </p>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Calendar Card - Always visible */}
      <Card className="border-2">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl">Select Date</CardTitle>
          <CardDescription className="text-sm sm:text-base">Choose your preferred date</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center px-2 sm:px-6">
          <div className="w-full max-w-[340px] sm:max-w-md">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border w-full"
              disabled={(date) => date < new Date()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile: Drawer Trigger Button */}
      {isMobile && date && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button className="w-full" size="lg">
              <CalendarIcon className="mr-2 h-5 w-5" />
              Continue to Booking Details
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Booking Details</DrawerTitle>
              <DrawerDescription>
                Complete your appointment for {date && format(date, "MMMM d, yyyy")}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto space-y-4 pb-4">
              <BookingDetailsContent />
            </div>
            <DrawerFooter className="pt-2">
              <Button
                onClick={handleBooking}
                disabled={loading || !selectedSlot || !selectedServiceId}
                className="w-full"
                size="lg"
              >
                {loading ? "Booking..." : "Book Appointment"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Desktop: Card Layout */}
      {!isMobile && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Booking Details</CardTitle>
            <CardDescription className="text-sm sm:text-base">Complete your appointment booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BookingDetailsContent />
            <Button
              onClick={handleBooking}
              disabled={loading || !selectedSlot || !selectedServiceId}
              className="w-full text-sm sm:text-base py-2 sm:py-3"
            >
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BookingCalendar;
