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

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

const services = [
  "Haircut & Styling",
  "Hair Coloring",
  "Makeup Application",
  "Manicure & Pedicure",
  "Facial Treatment",
  "Waxing",
  "Eyelash Extensions",
];

const BookingCalendar = () => {
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (date) {
      fetchAvailableSlots();
    }
  }, [date]);

  const fetchAvailableSlots = async () => {
    if (!date) return;

    const formattedDate = format(date, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("date", formattedDate)
      .eq("is_available", true)
      .order("start_time");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch available slots",
        variant: "destructive",
      });
      return;
    }

    setAvailableSlots(data || []);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !serviceType) {
      toast({
        title: "Missing information",
        description: "Please select a time slot and service type",
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

    const { error } = await supabase.from("appointments").insert({
      client_id: user.id,
      slot_id: selectedSlot,
      service_type: serviceType,
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
      setServiceType("");
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
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
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
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot === slot.id ? "default" : "outline"}
                      onClick={() => setSelectedSlot(slot.id)}
                      className="justify-start"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {slot.start_time.slice(0, 5)}
                    </Button>
                  ))}
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
            />
          </div>

          <Button
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !serviceType}
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
