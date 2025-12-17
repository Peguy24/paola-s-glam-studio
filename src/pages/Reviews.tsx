import { useState, useEffect } from "react";
import { Star, Quote, Sparkles, Image as ImageIcon, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  review: string | null;
  photos: string[] | null;
  created_at: string;
  admin_response: string | null;
  client: {
    full_name: string | null;
  } | null;
  service: {
    name: string;
    category: string;
  } | null;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          rating,
          review,
          photos,
          created_at,
          admin_response,
          client:profiles!ratings_client_id_fkey(full_name),
          service:services!ratings_service_id_fkey(name, category)
        `)
        .not("review", "is", null)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedData = data as Review[];
      setReviews(typedData);

      // Extract unique categories
      const uniqueCategories = [...new Set(typedData.map(r => r.service?.category).filter(Boolean))] as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = filter === "all" 
    ? reviews 
    : reviews.filter(r => r.service?.category === filter);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-primary text-primary"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // Calculate stats
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-primary/5 via-secondary/5 to-background">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-full text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            Client Testimonials
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent px-4">
            What Our Clients Say
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 px-4">
            Real experiences from our valued clients. See why they trust us with their beauty journey.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 mb-6 sm:mb-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{reviews.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{averageRating}</span>
                <Star className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 fill-primary text-primary" />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{fiveStarCount}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">5-Star Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-6 px-4 border-b border-border sticky top-20 bg-background/95 backdrop-blur-sm z-40">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
              onClick={() => setFilter("all")}
            >
              All Reviews
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={filter === category ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                onClick={() => setFilter(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-12 sm:py-16 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <Quote className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground mb-2">No Reviews Yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {filter === "all" 
                  ? "Be the first to share your experience!"
                  : `No reviews for ${filter} category yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredReviews.map((review, index) => (
                <Card 
                  key={review.id} 
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    {/* Quote Icon */}
                    <Quote className="h-8 w-8 text-primary/20 mb-4 group-hover:text-primary/40 transition-colors" />
                    
                    {/* Review Text */}
                    <p className="text-foreground mb-4 line-clamp-4 leading-relaxed">
                      "{review.review}"
                    </p>

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {review.photos.map((photo, idx) => (
                          <button
                            key={idx}
                            onClick={() => setLightboxImage(photo)}
                            className="relative group overflow-hidden rounded-lg"
                          >
                            <img
                              src={photo}
                              alt={`Review photo ${idx + 1}`}
                              className="h-16 w-16 object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Admin Response */}
                    {review.admin_response && (
                      <div className="mb-4 p-3 bg-primary/5 rounded-lg border-l-2 border-primary">
                        <p className="text-sm text-muted-foreground italic">
                          <span className="font-medium text-primary">Response:</span> {review.admin_response}
                        </p>
                      </div>
                    )}

                    {/* Rating */}
                    <div className="mb-4">
                      {renderStars(review.rating)}
                    </div>

                    {/* Client Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-semibold">
                            {getInitials(review.client?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {review.client?.full_name || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Service Badge */}
                      {review.service && (
                        <Badge variant="secondary" className="text-xs">
                          {review.service.name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-foreground px-4">
            Ready to Experience the Difference?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 px-4">
            Join our satisfied clients and discover your own transformation.
          </p>
          <a
            href="/appointments"
            className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:shadow-[var(--shadow-glow)] transition-all text-sm sm:text-base"
          >
            Book Your Appointment
          </a>
        </div>
      </section>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-2 right-2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Review photo"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Reviews;
