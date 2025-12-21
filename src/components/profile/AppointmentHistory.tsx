import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, FileText, XCircle, Star, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getSignedPhotoUrls } from "@/lib/storage";

interface Appointment {
  id: string;
  service_type: string;
  service_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  service: {
    name: string;
    price: number;
    category: string;
  } | null;
  slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
  ratings: Array<{
    id: string;
    rating: number;
    review: string | null;
    photos: string[] | null;
  }>;
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

interface AppointmentHistoryProps {
  userId: string;
}

const AppointmentHistory = ({ userId }: AppointmentHistoryProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, [userId]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        service_id,
        status,
        notes,
        created_at,
        service:service_id (
          name,
          price,
          category
        ),
        slot:slot_id (
          date,
          start_time,
          end_time
        ),
        ratings (
          id,
          rating,
          review,
          photos
        )
      `)
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
      return;
    }

    // Convert photo URLs to signed URLs for display
    const appointmentsWithSignedUrls = await Promise.all(
      (data as unknown as Appointment[]).map(async (appointment) => {
        if (appointment.ratings && appointment.ratings.length > 0 && appointment.ratings[0].photos) {
          const signedPhotos = await getSignedPhotoUrls(appointment.ratings[0].photos);
          return {
            ...appointment,
            ratings: [{ ...appointment.ratings[0], photos: signedPhotos }]
          };
        }
        return appointment;
      })
    );

    setAppointments(appointmentsWithSignedUrls);
    setLoading(false);
  };

  const cancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Appointment cancelled successfully",
    });

    fetchAppointments();
  };

  const openRatingDialog = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    if (appointment.ratings && appointment.ratings.length > 0) {
      setRating(appointment.ratings[0].rating);
      setReview(appointment.ratings[0].review || "");
      // Get signed URLs for existing photos
      const photos = appointment.ratings[0].photos || [];
      if (photos.length > 0) {
        const signedUrls = await getSignedPhotoUrls(photos);
        setExistingPhotos(signedUrls);
      } else {
        setExistingPhotos([]);
      }
    } else {
      setRating(0);
      setReview("");
      setExistingPhotos([]);
    }
    setPhotos([]);
    setPhotoPreviews([]);
    setRatingDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 3 - photos.length - existingPhotos.length);
    
    if (photos.length + existingPhotos.length + newPhotos.length > 3) {
      toast({
        title: "Maximum 3 photos",
        description: "You can upload up to 3 photos per review",
        variant: "destructive",
      });
      return;
    }

    setPhotos([...photos, ...newPhotos]);
    
    // Create previews
    newPhotos.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('review-photos')
        .upload(fileName, photo);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Store the path reference (we'll generate signed URLs when displaying)
      // Using a format that can be parsed by getSignedPhotoUrl
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const storedUrl = `${baseUrl}/storage/v1/object/public/review-photos/${fileName}`;
      uploadedUrls.push(storedUrl);
    }
    
    return uploadedUrls;
  };

  const submitRating = async () => {
    if (!selectedAppointment || rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    const existingRating = selectedAppointment.ratings?.[0];
    setUploadingPhotos(true);

    try {
      // Upload new photos if any
      let allPhotoUrls = [...existingPhotos];
      if (photos.length > 0) {
        const newPhotoUrls = await uploadPhotos();
        allPhotoUrls = [...allPhotoUrls, ...newPhotoUrls];
      }

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from("ratings")
          .update({
            rating,
            review: review.trim() || null,
            photos: allPhotoUrls.length > 0 ? allPhotoUrls : null,
          })
          .eq("id", existingRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from("ratings")
          .insert({
            appointment_id: selectedAppointment.id,
            client_id: userId,
            service_id: selectedAppointment.service_id,
            rating,
            review: review.trim() || null,
            photos: allPhotoUrls.length > 0 ? allPhotoUrls : null,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: existingRating ? "Rating updated successfully" : "Thank you for your rating!",
      });

      setRatingDialogOpen(false);
      setPhotos([]);
      setPhotoPreviews([]);
      setExistingPhotos([]);
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No appointments found</p>
          <Button onClick={() => window.location.href = "/appointments"}>
            Book Your First Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const appointmentDate = new Date(appointment.slot.date);
        const isPast = appointmentDate < new Date();
        const canCancel = !isPast && appointment.status !== "cancelled" && appointment.status !== "completed";
        const canRate = appointment.status === "completed";
        const hasRating = appointment.ratings && appointment.ratings.length > 0;

        return (
          <Card key={appointment.id} className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">
                    {appointment.service?.name || appointment.service_type}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    {appointment.service && (
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        ${appointment.service.price.toFixed(2)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(appointmentDate, "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {appointment.slot.start_time.slice(0, 5)} - {appointment.slot.end_time.slice(0, 5)}
                    </div>
                  </CardDescription>
                </div>
                <Badge className={statusColors[appointment.status as keyof typeof statusColors]}>
                  {appointment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointment.notes && (
                <div className="flex gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">Your Notes:</p>
                    <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                  </div>
                </div>
              )}

              {hasRating && (
                <div className="flex gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Your Rating:</p>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= appointment.ratings[0].rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    {appointment.ratings[0].review && (
                      <p className="text-sm text-muted-foreground mb-2">{appointment.ratings[0].review}</p>
                    )}
                    {appointment.ratings[0].photos && appointment.ratings[0].photos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {appointment.ratings[0].photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Review photo ${idx + 1}`}
                            className="h-16 w-16 object-cover rounded-lg border border-border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {canCancel && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Appointment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this appointment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelAppointment(appointment.id)}>
                          Yes, Cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {canRate && (
                  <Button
                    variant={hasRating ? "outline" : "default"}
                    size="sm"
                    onClick={() => openRatingDialog(appointment)}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {hasRating ? "Edit Rating" : "Rate Service"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your experience with {selectedAppointment?.service?.name || selectedAppointment?.service_type}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground hover:text-primary/50"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review">Review (Optional)</Label>
              <Textarea
                id="review"
                placeholder="Share your experience..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
              />
            </div>
            
            {/* Photo Upload Section */}
            <div className="space-y-2">
              <Label>Photos (Optional - Max 3)</Label>
              <div className="flex flex-wrap gap-2">
                {/* Existing Photos */}
                {existingPhotos.map((url, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`Review photo ${index + 1}`}
                      className="h-20 w-20 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* New Photo Previews */}
                {photoPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <img
                      src={preview}
                      alt={`New photo ${index + 1}`}
                      className="h-20 w-20 object-cover rounded-lg border border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* Upload Button */}
                {existingPhotos.length + photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <p className="text-xs text-muted-foreground">Share photos of your results</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)} disabled={uploadingPhotos}>
              Cancel
            </Button>
            <Button onClick={submitRating} disabled={uploadingPhotos}>
              {uploadingPhotos ? "Uploading..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentHistory;
