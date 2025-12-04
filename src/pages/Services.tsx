import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Paintbrush, Sparkles, Heart, Pencil, Trash2, Star } from "lucide-react";
import { ServiceRatings } from "@/components/ServiceRatings";

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  avgRating?: number;
  ratingCount?: number;
}

const categoryIcons: Record<string, JSX.Element> = {
  "Hair Services": <Scissors className="h-8 w-8" />,
  "Nail Services": <Paintbrush className="h-8 w-8" />,
  "Makeup Services": <Sparkles className="h-8 w-8" />,
  "Spa Treatments": <Heart className="h-8 w-8" />,
};

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
  });
  const [selectedServiceForReviews, setSelectedServiceForReviews] = useState<string | null>(null);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchServices();
  }, []);

  const checkAdminStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    setIsAdmin(data || false);
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch ratings for all services
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("service_id, rating");

      // Calculate average ratings
      const ratingsMap = new Map<string, { total: number; count: number }>();
      ratingsData?.forEach((rating) => {
        if (!rating.service_id) return;
        const existing = ratingsMap.get(rating.service_id) || { total: 0, count: 0 };
        ratingsMap.set(rating.service_id, {
          total: existing.total + rating.rating,
          count: existing.count + 1,
        });
      });

      // Add ratings to services
      const servicesWithRatings = data?.map((service) => {
        const ratings = ratingsMap.get(service.id);
        return {
          ...service,
          avgRating: ratings ? ratings.total / ratings.count : undefined,
          ratingCount: ratings?.count || 0,
        };
      });

      setServices(servicesWithRatings || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      category: service.category,
      description: service.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingService) return;

    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: formData.name,
          price: parseFloat(formData.price),
          category: formData.category,
          description: formData.description || null,
        })
        .eq("id", editingService.id);

      if (error) throw error;

      toast({ title: "Service updated successfully" });
      setEditDialogOpen(false);
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"?`)) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast({ title: "Service deleted successfully" });
      fetchServices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
    }, {} as Record<string, Service[]>);

  const handleViewReviews = (serviceId: string) => {
    setSelectedServiceForReviews(serviceId);
    setReviewsDialogOpen(true);
  };

  const selectedService = services.find(s => s.id === selectedServiceForReviews);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p className="text-muted-foreground">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Our Services
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Premium beauty treatments tailored to enhance your natural beauty
            </p>
          </div>

          {Object.keys(groupedServices).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <Card key={category} className="border-2 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)] transition-all">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 sm:p-3 bg-gradient-to-br from-primary to-secondary rounded-xl text-primary-foreground">
                        {categoryIcons[category] || <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />}
                      </div>
                      <CardTitle className="text-xl sm:text-2xl">{category}</CardTitle>
                    </div>
                    <CardDescription className="text-sm sm:text-base">Professional treatments with premium products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {categoryServices.map((service) => (
                        <li key={service.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors group">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base">{service.name}</span>
                              {service.avgRating && service.ratingCount! > 0 && (
                                <button
                                  onClick={() => handleViewReviews(service.id)}
                                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                                >
                                  <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-primary text-primary" />
                                  <span className="text-xs sm:text-sm font-medium text-primary">
                                    {service.avgRating.toFixed(1)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({service.ratingCount})
                                  </span>
                                </button>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{service.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <span className="text-primary font-semibold text-sm sm:text-base">${service.price.toFixed(2)}</span>
                            {isAdmin && (
                              <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(service)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(service.id, service.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-12 p-6 sm:p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl text-center border border-border">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Book Your Service Today</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Visit our appointments page to schedule your beauty session
            </p>
            <a
              href="/appointments"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:shadow-[var(--shadow-glow)] transition-all"
            >
              Book Appointment
            </a>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update the service details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Service Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Service</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reviews Dialog */}
      <Dialog open={reviewsDialogOpen} onOpenChange={setReviewsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Reviews for {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Read what our customers have to say about this service
            </DialogDescription>
          </DialogHeader>
          {selectedServiceForReviews && selectedService && (
            <ServiceRatings 
              serviceId={selectedServiceForReviews} 
              serviceName={selectedService.name}
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Services;
