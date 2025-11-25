import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  admin_response: string | null;
  admin_response_at: string | null;
  created_at: string;
  client: {
    full_name: string | null;
    email: string;
  };
}

interface ServiceRatingsProps {
  serviceId: string;
  serviceName: string;
}

export function ServiceRatings({ serviceId, serviceName }: ServiceRatingsProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, [serviceId]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          rating,
          review,
          admin_response,
          admin_response_at,
          created_at,
          client:profiles!ratings_client_id_fkey(full_name, email)
        `)
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data as Rating[]);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  if (ratings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No reviews yet for {serviceName}. Be the first to leave a review!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Reviews ({ratings.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-6">
            {ratings.map((rating) => (
              <div key={rating.id} className="border-b last:border-0 pb-6 last:pb-0">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(rating.client.full_name, rating.client.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">
                        {rating.client.full_name || "Anonymous"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-2">{renderStars(rating.rating)}</div>
                    {rating.review && (
                      <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                        {rating.review}
                      </p>
                    )}
                    
                    {rating.admin_response && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            Response from {serviceName}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {rating.admin_response}
                        </p>
                        {rating.admin_response_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(rating.admin_response_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
