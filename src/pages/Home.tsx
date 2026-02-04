import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, Star, Heart, Loader2, ShoppingBag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import brandPhoto from "@/assets/brand-photo.jpeg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// Import glamour hero images
import glamour1 from "@/assets/hero/glamour-1.jpg";
import glamour2 from "@/assets/hero/glamour-2.jpg";
import glamour3 from "@/assets/hero/glamour-3.jpg";
import glamour4 from "@/assets/hero/glamour-4.jpg";

const heroImages = [
  { src: glamour1, alt: "Glamorous beauty transformation" },
  { src: glamour2, alt: "Professional beauty styling" },
  { src: glamour3, alt: "Stunning beauty looks" },
  { src: glamour4, alt: "Premium beauty experience" },
];

interface Transformation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  before_image_url: string;
  after_image_url: string;
  display_order: number;
}

const Home = () => {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [transformationsLoading, setTransformationsLoading] = useState(true);

  useEffect(() => {
    const loadTransformations = async () => {
      try {
        const { data, error } = await supabase
          .from("transformations" as any)
          .select("*")
          .order("display_order", { ascending: true })
          .limit(3);

        if (error) throw error;
        setTransformations((data as any) || []);
      } catch (error) {
        console.error('Error loading transformations:', error);
      } finally {
        setTransformationsLoading(false);
      }
    };

    loadTransformations();
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-soft)] opacity-50" />
        <div className="absolute top-20 right-10 w-32 sm:w-64 h-32 sm:h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-40 sm:w-80 h-40 sm:h-80 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-full text-xs sm:text-sm font-medium text-primary">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                Premium Beauty Experience
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Unleash Your
                </span>
                <br />
                <span className="text-foreground">Inner Glamour</span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-xl">
                Experience luxury beauty services from hair styling to nail artistry, all in one stunning destination.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Link to="/appointments" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)] text-sm sm:text-base lg:text-lg px-5 sm:px-6 lg:px-8">
                    <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Book Now
                  </Button>
                </Link>
                <Link to="/services" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base lg:text-lg px-5 sm:px-6 lg:px-8 border-2">
                    <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    View Services
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-4 sm:gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Trusted by 500+ clients</p>
                </div>
              </div>
            </div>
            
            {/* Glamour Hero Carousel */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                plugins={[
                  Autoplay({
                    delay: 3500,
                    stopOnInteraction: false,
                  }),
                ]}
                className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border"
              >
                <CarouselContent className="-ml-0">
                  {heroImages.map((image, index) => (
                    <CarouselItem key={index} className="pl-0">
                      <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover object-top"
                        />
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              
              {/* Decorative sparkle elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gold rounded-full animate-pulse opacity-80" />
              <div className="absolute top-1/4 -left-3 w-3 h-3 bg-primary rounded-full animate-pulse opacity-60" />
              <div className="absolute bottom-1/4 -right-2 w-2 h-2 bg-secondary rounded-full animate-pulse opacity-70" />
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gradient-to-b from-background to-secondary/5">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent/10 rounded-full text-xs sm:text-sm font-medium text-accent">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                Our Story
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                Where Beauty Meets{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Artistry
                </span>
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
                At Paola Beauty Glam, we believe that beauty is not just about looking good—it's about feeling confident and empowered. Founded with a passion for luxury beauty and self-care, we curate premium products and services that celebrate individuality.
              </p>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
                Our expert team combines years of experience with the latest trends and techniques to bring you transformative beauty experiences. From our carefully selected product line to our personalized services, every detail is designed with you in mind.
              </p>
              <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-6 lg:gap-8 pt-4">
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">500+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Happy Clients</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary">5+</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Years Experience</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent">100%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Premium Quality</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-3xl blur-2xl" />
              <img
                src={brandPhoto}
                alt="Paola Beauty Glam Story"
                className="relative rounded-3xl w-full object-cover shadow-2xl ring-1 ring-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Transformations Gallery */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gradient-to-b from-secondary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-full text-xs sm:text-sm font-medium text-primary mb-3 sm:mb-4">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              Our Transformations
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              See The{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Magic Happen
              </span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
              Real results from our expert beauty services
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {transformationsLoading ? (
              <div className="col-span-full text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : transformations.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No transformations to display yet.
              </div>
            ) : (
              transformations.map((transformation, index) => {
                const gradientClasses = [
                  "from-primary/10 to-secondary/10",
                  "from-secondary/10 to-accent/10",
                  "from-accent/10 to-primary/10"
                ];
                const badgeClasses = [
                  "bg-primary/90 text-primary-foreground",
                  "bg-secondary/90 text-primary-foreground",
                  "bg-accent/90 text-primary-foreground"
                ];
                
                return (
                  <div 
                    key={transformation.id} 
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClasses[index % 3]} p-1`}
                  >
                      <div className="bg-background rounded-xl overflow-hidden">
                        <div className="grid grid-cols-2">
                          <div className="relative">
                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 sm:px-3 sm:py-1 bg-background/90 rounded-full text-[10px] sm:text-xs font-semibold">
                              Before
                            </div>
                          <img
                            src={transformation.before_image_url}
                            alt={`${transformation.title} before`}
                            className="w-full h-40 sm:h-52 lg:h-64 object-cover"
                          />
                        </div>
                        <div className="relative">
                          <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 sm:px-3 sm:py-1 ${badgeClasses[index % 3]} rounded-full text-[10px] sm:text-xs font-semibold`}>
                            After
                          </div>
                          <img
                            src={transformation.after_image_url}
                            alt={`${transformation.title} after`}
                            className="w-full h-40 sm:h-52 lg:h-64 object-cover"
                          />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{transformation.title}</h3>
                        <p className="text-sm text-muted-foreground">{transformation.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)]">
                <Sparkles className="mr-2 h-4 w-4" />
                Explore Our Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Shop Coming Soon Banner */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-b from-background to-secondary/5">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border border-border/50 p-8 sm:p-12">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                  <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
                </div>
              </div>
              
              <div className="flex-1 text-center lg:text-left space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-full text-xs sm:text-sm font-medium text-accent">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  Coming Soon
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  Our{" "}
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    Shop
                  </span>{" "}
                  Is Coming!
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-xl">
                  We're preparing an exclusive selection of premium beauty products. 
                  Stay tuned to discover our collection!
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <Link to="/contact">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)]">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="container mx-auto text-center text-primary-foreground">
          <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Ready to Shine?</h2>
          <p className="text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto opacity-90 px-4">
            Book your appointment today and experience the Paola Beauty Glam difference
          </p>
          <Link to="/appointments">
            <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 text-sm sm:text-base lg:text-lg px-6 sm:px-8">
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
