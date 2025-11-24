import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, User, Mail, Phone } from "lucide-react";

interface Appointment {
  id: string;
  service_type: string;
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
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const ITEMS_PER_PAGE = 10;

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments(true);
  }, []);

  const fetchAppointments = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
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
        profile:client_id (
          full_name,
          email,
          phone
        )
      `, { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch appointments",
        variant: "destructive",
      });
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const newAppointments = data as unknown as Appointment[];
    
    if (reset) {
      setAppointments(newAppointments);
    } else {
      setAppointments(prev => [...prev, ...newAppointments]);
    }

    setHasMore(count ? (from + newAppointments.length) < count : false);
    setPage(currentPage + 1);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchAppointments(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Appointment status updated",
    });

    fetchAppointments(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  if (appointments.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No appointments found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-full">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="border-2 w-full overflow-hidden">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl mb-2 break-words">
                  {appointment.service?.name || appointment.service_type}
                </CardTitle>
                <CardDescription className="space-y-1 text-sm">
                  {appointment.service && (
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      ${appointment.service.price.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm break-words">
                      {format(new Date(appointment.slot.date), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {appointment.slot.start_time.slice(0, 5)} - {appointment.slot.end_time.slice(0, 5)}
                    </span>
                  </div>
                </CardDescription>
              </div>
              <Badge className={`${statusColors[appointment.status as keyof typeof statusColors]} whitespace-nowrap self-start`}>
                {appointment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="break-words">{appointment.profile.full_name}</span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="break-all">{appointment.profile.email}</span>
              </div>
              {appointment.profile.phone && (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">{appointment.profile.phone}</span>
                </div>
              )}
            </div>

            {appointment.notes && (
              <div className="p-2.5 sm:p-3 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Update Status:</span>
              <Select
                value={appointment.status}
                onValueChange={(value) => updateStatus(appointment.id, value)}
              >
                <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="pending" className="text-xs sm:text-sm">Pending</SelectItem>
                  <SelectItem value="confirmed" className="text-xs sm:text-sm">Confirmed</SelectItem>
                  <SelectItem value="completed" className="text-xs sm:text-sm">Completed</SelectItem>
                  <SelectItem value="cancelled" className="text-xs sm:text-sm">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={loadMore} 
            disabled={loadingMore}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;
