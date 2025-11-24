import { Link } from "react-router-dom";
import { Sparkles, Calendar, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";

const Home = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-soft)] opacity-50" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Premium Beauty Experience
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Unleash Your
                </span>
                <br />
                <span className="text-foreground">Inner Glamour</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                Experience luxury beauty services from hair styling to nail artistry, all in one stunning destination.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <Link to="/appointments" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)] text-base sm:text-lg px-6 sm:px-8">
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Now
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 border-2">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Shop Products
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Trusted by 500+ clients</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <img
                src={logo}
                alt="Paola Beauty Glam"
                className="relative rounded-3xl w-full object-cover shadow-2xl ring-1 ring-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Signature Services</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Indulge in our premium beauty treatments designed to make you feel extraordinary
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Hair Styling", emoji: "💇‍♀️", desc: "Expert cuts, colors, and treatments" },
              { title: "Nail Artistry", emoji: "💅", desc: "Manicures, pedicures, and nail art" },
              { title: "Makeup", emoji: "💄", desc: "Professional makeup for any occasion" },
            ].map((service) => (
              <div
                key={service.title}
                className="group p-8 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-[var(--shadow-elegant)] transition-all"
              >
                <div className="text-5xl mb-4">{service.emoji}</div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground">{service.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg" variant="outline" className="border-2">
                View All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="container mx-auto text-center text-primary-foreground">
          <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Shine?</h2>
          <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Book your appointment today and experience the Paola Beauty Glam difference
          </p>
          <Link to="/appointments">
            <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 text-lg px-8">
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
