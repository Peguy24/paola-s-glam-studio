import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Paintbrush, Sparkles, Heart } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: <Scissors className="h-8 w-8" />,
      title: "Hair Services",
      items: [
        { name: "Haircut & Styling", price: "$45+" },
        { name: "Hair Coloring", price: "$80+" },
        { name: "Highlights", price: "$120+" },
        { name: "Deep Conditioning", price: "$35" },
        { name: "Keratin Treatment", price: "$200+" },
      ],
    },
    {
      icon: <Paintbrush className="h-8 w-8" />,
      title: "Nail Services",
      items: [
        { name: "Classic Manicure", price: "$25" },
        { name: "Gel Manicure", price: "$40" },
        { name: "Classic Pedicure", price: "$35" },
        { name: "Gel Pedicure", price: "$55" },
        { name: "Nail Art (per nail)", price: "$5+" },
      ],
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Makeup Services",
      items: [
        { name: "Special Event Makeup", price: "$75" },
        { name: "Bridal Makeup", price: "$150+" },
        { name: "Makeup Lesson", price: "$80" },
        { name: "Lash Extensions", price: "$120+" },
        { name: "Brow Shaping & Tint", price: "$35" },
      ],
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Spa Treatments",
      items: [
        { name: "Facial Treatment", price: "$65+" },
        { name: "Waxing Services", price: "$15+" },
        { name: "Massage Therapy", price: "$80+" },
        { name: "Body Scrub", price: "$70" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Our Services
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Premium beauty treatments tailored to enhance your natural beauty
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((category) => (
              <Card key={category.title} className="border-2 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)] transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl text-primary-foreground">
                      {category.icon}
                    </div>
                    <CardTitle className="text-2xl">{category.title}</CardTitle>
                  </div>
                  <CardDescription>Professional treatments with premium products</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {category.items.map((item) => (
                      <li key={item.name} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted transition-colors">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-primary font-semibold">{item.price}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl text-center border border-border">
            <h3 className="text-2xl font-bold mb-3">Book Your Service Today</h3>
            <p className="text-muted-foreground mb-6">
              Visit our appointments page to schedule your beauty session
            </p>
            <a
              href="/appointments"
              className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:shadow-[var(--shadow-glow)] transition-all"
            >
              Book Appointment
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;
