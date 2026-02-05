import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import BookingCalendar from "@/components/BookingCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// Import glamour images
import glamour1 from "@/assets/booking/glamour-1.jpg";
import glamour2 from "@/assets/booking/glamour-2.jpg";
import glamour3 from "@/assets/booking/glamour-3.jpg";

const glamourImages = [
  { src: glamour1, alt: "Glamorous beauty transformation" },
  { src: glamour2, alt: "Professional makeup artistry" },
  { src: glamour3, alt: "Stunning beauty looks" },
];

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
      
      {/* Glamour Hero Banner */}
      <div className="relative pt-20 overflow-hidden">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 4000,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {glamourImages.map((image, index) => (
              <CarouselItem key={index} className="pl-0 relative">
                <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] w-full overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        
        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 sm:pb-12 px-4">
          <div className="container mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-primary/20 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Book Your Transformation
              </span>
              <Sparkles className="w-4 h-4 text-secondary" />
            </div>
          </div>
        </div>

        {/* Decorative sparkle elements */}
        <div className="absolute top-1/4 left-[10%] w-2 h-2 bg-gold rounded-full animate-pulse opacity-60" />
        <div className="absolute top-1/3 right-[15%] w-3 h-3 bg-primary rounded-full animate-pulse opacity-50 delay-100" />
        <div className="absolute bottom-1/3 left-[20%] w-2 h-2 bg-secondary rounded-full animate-pulse opacity-40 delay-200" />
      </div>

      <div className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-12 pt-6 sm:pt-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1 sm:mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Book an Appointment
              </h1>
              <p className="text-sm sm:text-base lg:text-xl text-muted-foreground">
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
