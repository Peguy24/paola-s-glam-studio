import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Appointments = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Book an Appointment
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Schedule your beauty transformation
            </p>
          </div>

          <Card className="border-2 max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full">
                <Calendar className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Booking System Coming Soon!</h2>
              <p className="text-muted-foreground mb-6">
                Our online booking system with real-time availability is being set up. You'll soon be able to see available time slots and book appointments directly on our website.
              </p>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-semibold">For now, please book by:</p>
                <p className="text-sm text-muted-foreground">📞 Phone: (555) 123-4567</p>
                <p className="text-sm text-muted-foreground">📧 Email: booking@paolabeautyglam.com</p>
                <p className="text-sm text-muted-foreground">💬 Instagram: @paolabeautyglam</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
