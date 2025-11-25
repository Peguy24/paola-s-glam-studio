import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Send, Clock, Sparkles } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone number must be less than 20 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
});

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validatedData = contactSchema.parse(formData);

      // Insert into database
      const { error } = await supabase
        .from("contact_messages")
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone || null,
          message: validatedData.message,
        }]);

      if (error) throw error;

      toast.success("Message sent successfully!", {
        description: "We'll get back to you as soon as possible.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Error", {
          description: error.message || "Failed to send message. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
              <Sparkles className="h-4 w-4" />
              Get In Touch
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Contact Us
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Have a question or want to book an appointment? We'd love to hear from you!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="border-2">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
                <p className="text-muted-foreground mb-6">
                  Fill out the form below and we'll respond within 24 hours
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleChange}
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.message.length}/1000
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="border-2 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold mb-6">Contact Information</h3>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Visit Us</h4>
                        <p className="text-muted-foreground">
                          123 Beauty Street<br />
                          Glamour City, GC 12345
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-secondary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Call Us</h4>
                        <p className="text-muted-foreground">
                          +1 (555) 123-4567<br />
                          Mon-Sat: 9AM - 7PM
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-accent" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Email Us</h4>
                        <p className="text-muted-foreground">
                          hello@paolabeautyglam.com<br />
                          We reply within 24 hours
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Business Hours</h4>
                        <p className="text-muted-foreground">
                          Monday - Friday: 9AM - 7PM<br />
                          Saturday: 10AM - 6PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 bg-gradient-to-br from-secondary/5 to-accent/5">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold mb-4">Why Choose Us?</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Expert beauty professionals with years of experience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span>Premium products and personalized services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <span>Flexible scheduling and convenient location</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
