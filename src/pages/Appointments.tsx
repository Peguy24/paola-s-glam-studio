import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import BookingCalendar from "@/components/BookingCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Appointments = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Book an Appointment
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                Schedule your beauty transformation
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <BookingCalendar />
        </div>
      </div>
    </div>
  );
};

export default Appointments;
