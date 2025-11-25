import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, Trash2, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  admin_response: string | null;
  admin_response_at: string | null;
  created_at: string;
  updated_at: string;
  client: {
    full_name: string | null;
    email: string;
  };
  service: {
    name: string;
    category: string;
  };
  appointment: {
    service_type: string;
  };
}

export function RatingsManagement() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  useEffect(() => {
    fetchRatings();
  }, []);

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
          updated_at,
          client:profiles!ratings_client_id_fkey(full_name, email),
          service:services!ratings_service_id_fkey(name, category),
          appointment:appointments!ratings_appointment_id_fkey(service_type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data as Rating[]);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      toast.error("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRating = (rating: Rating) => {
    setSelectedRating(rating);
    setAdminResponse(rating.admin_response || "");
    setViewDialogOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedRating) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("ratings")
        .update({
          admin_response: adminResponse || null,
          admin_response_at: adminResponse ? new Date().toISOString() : null,
          admin_responder_id: adminResponse ? user?.id : null,
        })
        .eq("id", selectedRating.id);

      if (error) throw error;

      toast.success("Response saved successfully");
      fetchRatings();
      setViewDialogOpen(false);
    } catch (error) {
      console.error("Error saving response:", error);
      toast.error("Failed to save response");
    }
  };

  const handleDeleteClick = (ratingId: string) => {
    setRatingToDelete(ratingId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRating = async () => {
    if (!ratingToDelete) return;

    try {
      const { error } = await supabase
        .from("ratings")
        .delete()
        .eq("id", ratingToDelete);

      if (error) throw error;

      toast.success("Rating deleted successfully");
      fetchRatings();
    } catch (error) {
      console.error("Error deleting rating:", error);
      toast.error("Failed to delete rating");
    } finally {
      setDeleteDialogOpen(false);
      setRatingToDelete(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading ratings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ratings Management</h2>
          <p className="text-muted-foreground">
            View and moderate client reviews
          </p>
        </div>
        <Badge variant="secondary">{ratings.length} Total Ratings</Badge>
      </div>

      <div className="border rounded-lg">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No ratings found
                  </TableCell>
                </TableRow>
              ) : (
                ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {rating.client.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rating.client.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rating.service.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {rating.service.category}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{renderStars(rating.rating)}</TableCell>
                    <TableCell className="max-w-xs">
                      {rating.review ? (
                        <p className="truncate text-sm">{rating.review}</p>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No review
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rating.admin_response ? (
                        <div className="flex items-center gap-1 text-primary">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">Replied</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No response
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(rating.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRating(rating)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(rating.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* View Rating Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rating Details & Response</DialogTitle>
            <DialogDescription>
              View review and add or edit your response
            </DialogDescription>
          </DialogHeader>
          {selectedRating && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Client</label>
                <p className="text-sm">
                  {selectedRating.client.full_name || "Unknown"} (
                  {selectedRating.client.email})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Service</label>
                <p className="text-sm">{selectedRating.service.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Rating</label>
                <div className="mt-1">{renderStars(selectedRating.rating)}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Review</label>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {selectedRating.review || "No review provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <p className="text-sm">
                  {new Date(selectedRating.created_at).toLocaleString()}
                </p>
              </div>
              
              <div className="border-t pt-4">
                <label className="text-sm font-medium">Admin Response</label>
                {selectedRating.admin_response_at && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Last updated: {new Date(selectedRating.admin_response_at).toLocaleString()}
                  </p>
                )}
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write your response to this review..."
                  className="mt-2 min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveResponse}>
              Save Response
            </Button>
            {selectedRating && (
              <Button
                variant="destructive"
                onClick={() => {
                  setViewDialogOpen(false);
                  handleDeleteClick(selectedRating.id);
                }}
              >
                Delete Review
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rating</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rating? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRating}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
