import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, Clock3, AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const statusIcons = {
  pending: AlertCircle,
  confirmed: Clock3,
  completed: CheckCircle,
  cancelled: XCircle,
};

const ITEMS_PER_PAGE = 10;

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStatusCounts();
  }, []);

  useEffect(() => {
    fetchAppointments(true);
  }, [statusFilter]);

  const fetchStatusCounts = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("status");

    if (!error && data) {
      const counts: Record<string, number> = { all: data.length };
      data.forEach((apt: { status: string }) => {
        counts[apt.status] = (counts[apt.status] || 0) + 1;
      });
      setStatusCounts(counts);
    }
  };

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

    let query = supabase
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
      `, { count: 'exact' });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error, count } = await query
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
    // Get the current status before updating
    const currentAppointment = appointments.find(a => a.id === appointmentId);
    const previousStatus = currentAppointment?.status;

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

    // Send status notification via email/SMS
    try {
      await supabase.functions.invoke("notify-appointment-status", {
        body: { 
          appointmentId,
          newStatus,
          previousStatus
        },
      });
      console.log(`Status notification sent for appointment: ${appointmentId} (${previousStatus} -> ${newStatus})`);
    } catch (error) {
      console.error("Failed to send status notification:", error);
      // Don't block the status update if notification fails
    }

    // Send review reminder when appointment is marked as completed
    if (newStatus === "completed") {
      try {
        await supabase.functions.invoke("send-review-reminder", {
          body: { appointmentId },
        });
        console.log("Review reminder sent for appointment:", appointmentId);
      } catch (error) {
        console.error("Failed to send review reminder:", error);
      }
    }

    toast({
      title: "Success",
      description: "Appointment status updated",
    });

    fetchAppointments(true);
    fetchStatusCounts();
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const fetchAllAppointmentsForExport = async (): Promise<Appointment[]> => {
    let query = supabase
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
      `);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data as unknown as Appointment[];
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const allAppointments = await fetchAllAppointmentsForExport();
      
      if (allAppointments.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no appointments to export.",
          variant: "destructive",
        });
        return;
      }

      const headers = ["Date", "Time", "Service", "Category", "Price", "Client Name", "Email", "Phone", "Status", "Notes"];
      
      const rows = allAppointments.map(apt => [
        format(new Date(apt.slot.date), "yyyy-MM-dd"),
        `${apt.slot.start_time.slice(0, 5)} - ${apt.slot.end_time.slice(0, 5)}`,
        apt.service?.name || apt.service_type,
        apt.service?.category || "",
        apt.service ? `$${apt.service.price.toFixed(2)}` : "",
        apt.profile.full_name,
        apt.profile.email,
        apt.profile.phone || "",
        apt.status,
        apt.notes || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `appointments_${statusFilter}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast({
        title: "Export successful",
        description: `Exported ${allAppointments.length} appointments to CSV.`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const allAppointments = await fetchAllAppointmentsForExport();
      
      if (allAppointments.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no appointments to export.",
          variant: "destructive",
        });
        return;
      }

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text("Appointments Report", 14, 22);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Filter: ${statusFilter === "all" ? "All Appointments" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`, 14, 30);
      doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 36);
      doc.text(`Total: ${allAppointments.length} appointments`, 14, 42);

      // Table
      const tableData = allAppointments.map(apt => [
        format(new Date(apt.slot.date), "MMM d, yyyy"),
        apt.slot.start_time.slice(0, 5),
        apt.service?.name || apt.service_type,
        apt.profile.full_name,
        apt.profile.email,
        apt.service ? `$${apt.service.price.toFixed(2)}` : "",
        apt.status,
      ]);

      autoTable(doc, {
        head: [["Date", "Time", "Service", "Client", "Email", "Price", "Status"]],
        body: tableData,
        startY: 48,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 245, 250] },
      });

      doc.save(`appointments_${statusFilter}_${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "Export successful",
        description: `Exported ${allAppointments.length} appointments to PDF.`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading && appointments.length === 0) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={handleFilterChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            All
            {statusCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs px-1.5">
                {statusCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
            <span className="hidden sm:inline">Pending</span>
            {statusCounts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {statusCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Clock3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-green-500" />
            <span className="hidden sm:inline">Confirmed</span>
            {statusCounts.confirmed > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {statusCounts.confirmed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-blue-500" />
            <span className="hidden sm:inline">Completed</span>
            {statusCounts.completed > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {statusCounts.completed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-red-500" />
            <span className="hidden sm:inline">Cancelled</span>
            {statusCounts.cancelled > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {statusCounts.cancelled}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Export Buttons */}
      {appointments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <span className="text-xs text-muted-foreground self-center ml-2">
            {statusFilter === "all" ? "All" : statusFilter} appointments
          </span>
        </div>
      )}

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "No appointments found" 
                : `No ${statusFilter} appointments found`}
            </p>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
};

export default AppointmentsList;
