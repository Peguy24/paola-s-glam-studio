import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Calendar as CalendarIcon, Phone, CreditCard, Wallet, Loader2 } from "lucide-react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

 interface CancellationPolicy {
   hours_before: number;
   refund_percentage: number;
 }
 
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

interface ServiceBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service;
}

const bookingSchema = z.object({
  notes: z
    .string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, { message: "Please enter a valid phone number" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[\d\s\-\+\(\)]+$/, { message: "Please enter a valid phone number" }),
});

export const ServiceBookingDialog = ({ open, onOpenChange, service }: ServiceBookingDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [existingPhone, setExistingPhone] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pay_now" | "pay_later">("pay_now");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
   const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      checkUser();
      fetchUserPhone();
       fetchCancellationPolicies();
    }
  }, [open]);

  useEffect(() => {
    if (date && open) {
      fetchAvailableSlots();
    }
  }, [date, open]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchUserPhone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (profile?.phone) {
      setPhone(profile.phone);
      setExistingPhone(profile.phone);
    }
  };

   const fetchCancellationPolicies = async () => {
     const { data } = await supabase
       .from("cancellation_policies")
       .select("hours_before, refund_percentage")
       .eq("is_active", true)
       .order("hours_before", { ascending: false });
 
     if (data) {
       setCancellationPolicies(data);
     }
   };
 
  const fetchAvailableSlots = async () => {
    if (!date) return;

    const formattedDate = format(date, "yyyy-MM-dd");

    const { data: slotsData, error: slotsError } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("date", formattedDate)
      .eq("is_available", true)
      .order("start_time", { ascending: true });

    if (slotsError) {
      toast({
        title: "Error",
        description: "Failed to fetch available slots",
        variant: "destructive",
      });
      return;
    }

    // Get booking counts for each slot
    const { data: bookingsData } = await supabase
      .from("appointments")
      .select("slot_id")
      .in("slot_id", slotsData?.map((s) => s.id) || [])
      .neq("status", "cancelled");

    const bookingCounts: Record<string, number> = {};
    bookingsData?.forEach((booking) => {
      bookingCounts[booking.slot_id] = (bookingCounts[booking.slot_id] || 0) + 1;
    });

    const slotsWithAvailability =
      slotsData?.map((slot) => ({
        ...slot,
        bookings_count: bookingCounts[slot.id] || 0,
      })) || [];

    const availableSlotsFiltered = slotsWithAvailability.filter(
      (slot) => slot.bookings_count < slot.capacity
    );

    setAvailableSlots(availableSlotsFiltered);
    setSelectedSlot("");
  };

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to book an appointment",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!date || !selectedSlot) {
      toast({
        title: "Missing information",
        description: "Please select a date and time slot",
        variant: "destructive",
      });
      return;
    }

    const validation = bookingSchema.safeParse({ notes, phone });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update phone if changed
      if (phone !== existingPhone) {
        await supabase.from("profiles").update({ phone }).eq("id", user.id);
      }

      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          client_id: user.id,
          slot_id: selectedSlot,
          service_id: service.id,
          service_type: service.name,
          notes: notes || null,
          status: "pending",
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      if (paymentMethod === "pay_now") {
        // Create Stripe checkout session
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          "create-service-payment",
          {
            body: {
              appointmentId: appointment.id,
              serviceName: service.name,
              servicePrice: service.price,
              returnUrl: window.location.origin,
            },
          }
        );

        if (checkoutError) throw checkoutError;

        if (checkoutData?.url) {
          window.open(checkoutData.url, "_blank");
        }
      }

      toast({
        title: "Booking confirmed!",
        description:
          paymentMethod === "pay_now"
            ? "Complete payment in the new tab to confirm your appointment"
            : "Your appointment is booked. Payment will be collected at the salon.",
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setSelectedSlot("");
    setNotes("");
    setAvailableSlots([]);
  };

  const disabledDays = { before: new Date() };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to book an appointment for {service.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Button onClick={() => navigate("/login")}>Sign In</Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Book {service.name}</DialogTitle>
          <DialogDescription>
            <span className="text-primary font-semibold text-lg">${service.price.toFixed(2)}</span>
            {service.description && (
              <span className="block mt-1 text-muted-foreground">{service.description}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Date Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={disabledDays}
              className="rounded-md border mx-auto"
            />
          </div>

          {/* Time Slots */}
          {date && (
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                Available Times for {format(date, "MMMM d, yyyy")}
              </Label>
              {availableSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No available slots for this date. Please choose another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedSlot === slot.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot.id)}
                      className="text-sm"
                    >
                      {slot.start_time.substring(0, 5)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phone Number */}
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for booking confirmations
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Special Requests (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-3 block">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as "pay_now" | "pay_later")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pay_now" id="pay_now" />
                <Label htmlFor="pay_now" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-medium">Pay Now</span>
                    <p className="text-xs text-muted-foreground">Secure payment via Stripe</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pay_later" id="pay_later" />
                <Label htmlFor="pay_later" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="h-4 w-4 text-secondary" />
                  <div>
                    <span className="font-medium">Pay at Salon</span>
                    <p className="text-xs text-muted-foreground">Pay when you arrive</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

         {/* Cancellation Policy Display */}
         {cancellationPolicies.length > 0 && (
           <div className="bg-muted/50 p-4 rounded-lg border">
             <p className="text-sm font-medium mb-2">Cancellation Policy:</p>
             <ul className="text-xs text-muted-foreground space-y-1">
               {cancellationPolicies
                 .sort((a, b) => b.hours_before - a.hours_before)
                 .map((policy, index, arr) => {
                   const nextPolicy = arr[index + 1];
                   if (policy.hours_before === 0) {
                     return (
                       <li key={policy.hours_before}>
                         • No refund for last-minute cancellations
                       </li>
                     );
                   } else if (!nextPolicy || nextPolicy.hours_before === 0) {
                     return (
                       <li key={policy.hours_before}>
                         • {policy.refund_percentage}% refund if cancelled {policy.hours_before}+ hours before
                       </li>
                     );
                   } else {
                     return (
                       <li key={policy.hours_before}>
                         • {policy.refund_percentage}% refund if cancelled {nextPolicy.hours_before}-{policy.hours_before} hours before
                       </li>
                     );
                   }
                 })}
             </ul>
           </div>
         )}
 
          {/* Book Button */}
          <Button
            onClick={handleBooking}
            disabled={loading || !date || !selectedSlot || !phone}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {paymentMethod === "pay_now" ? "Book & Pay Now" : "Confirm Booking"}
                {" - $"}
                {service.price.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
