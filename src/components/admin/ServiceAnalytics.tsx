import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, TrendingUp, Calendar, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ServiceStats {
  service_id: string;
  service_name: string;
  category: string;
  price: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  potential_revenue: number;
}

export function ServiceAnalytics() {
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    potentialRevenue: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch all appointments with service data
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          status,
          service_id,
          service:service_id (
            id,
            name,
            price,
            category
          )
        `);

      if (error) throw error;

      // Aggregate statistics by service
      const serviceMap = new Map<string, ServiceStats>();

      appointments?.forEach((apt) => {
        if (!apt.service) return;

        const serviceId = apt.service.id;
        if (!serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            service_id: serviceId,
            service_name: apt.service.name,
            category: apt.service.category,
            price: apt.service.price,
            total_bookings: 0,
            pending_bookings: 0,
            confirmed_bookings: 0,
            completed_bookings: 0,
            cancelled_bookings: 0,
            total_revenue: 0,
            potential_revenue: 0,
          });
        }

        const stats = serviceMap.get(serviceId)!;
        stats.total_bookings++;

        switch (apt.status) {
          case "pending":
            stats.pending_bookings++;
            stats.potential_revenue += apt.service.price;
            break;
          case "confirmed":
            stats.confirmed_bookings++;
            stats.potential_revenue += apt.service.price;
            break;
          case "completed":
            stats.completed_bookings++;
            stats.total_revenue += apt.service.price;
            break;
          case "cancelled":
            stats.cancelled_bookings++;
            break;
        }
      });

      const statsArray = Array.from(serviceMap.values()).sort(
        (a, b) => b.total_bookings - a.total_bookings
      );

      // Calculate totals
      const totals = statsArray.reduce(
        (acc, stat) => ({
          totalBookings: acc.totalBookings + stat.total_bookings,
          totalRevenue: acc.totalRevenue + stat.total_revenue,
          potentialRevenue: acc.potentialRevenue + stat.potential_revenue,
        }),
        { totalBookings: 0, totalRevenue: 0, potentialRevenue: 0 }
      );

      setStats(statsArray);
      setTotalStats(totals);
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

  const exportToCSV = () => {
    const csvHeaders = [
      "Service Name",
      "Category",
      "Price",
      "Total Bookings",
      "Pending",
      "Confirmed",
      "Completed",
      "Cancelled",
      "Completed Revenue",
      "Potential Revenue",
    ];

    const csvRows = stats.map((stat) => [
      stat.service_name,
      stat.category,
      stat.price.toFixed(2),
      stat.total_bookings,
      stat.pending_bookings,
      stat.confirmed_bookings,
      stat.completed_bookings,
      stat.cancelled_bookings,
      stat.total_revenue.toFixed(2),
      stat.potential_revenue.toFixed(2),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
      "",
      "Summary",
      `Total Bookings,${totalStats.totalBookings}`,
      `Total Revenue,$${totalStats.totalRevenue.toFixed(2)}`,
      `Potential Revenue,$${totalStats.potentialRevenue.toFixed(2)}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `service-analytics-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Analytics exported to CSV",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Service Analytics Report", 14, 20);

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    // Summary section
    doc.setFontSize(14);
    doc.text("Summary", 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Bookings: ${totalStats.totalBookings}`, 14, 45);
    doc.text(`Completed Revenue: $${totalStats.totalRevenue.toFixed(2)}`, 14, 52);
    doc.text(`Potential Revenue: $${totalStats.potentialRevenue.toFixed(2)}`, 14, 59);

    // Service statistics table
    autoTable(doc, {
      startY: 68,
      head: [
        [
          "Service",
          "Category",
          "Price",
          "Total",
          "Completed",
          "Pending",
          "Revenue",
          "Potential",
        ],
      ],
      body: stats.map((stat) => [
        stat.service_name,
        stat.category,
        `$${stat.price.toFixed(2)}`,
        stat.total_bookings,
        stat.completed_bookings,
        stat.pending_bookings + stat.confirmed_bookings,
        `$${stat.total_revenue.toFixed(2)}`,
        `$${stat.potential_revenue.toFixed(2)}`,
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
    });

    doc.save(`service-analytics-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "Success",
      description: "Analytics exported to PDF",
    });
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Completed Revenue
            </CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ${totalStats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From completed appointments
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Potential Revenue
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ${totalStats.potentialRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending & confirmed bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Statistics Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Service Performance
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Detailed statistics for each service offering
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm" className="text-xs">
                <FileText className="mr-2 h-3.5 w-3.5" />
                CSV
              </Button>
              <Button onClick={exportToPDF} variant="outline" size="sm" className="text-xs">
                <Download className="mr-2 h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No booking data available yet
            </p>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="block lg:hidden space-y-3">
                {stats.map((stat) => (
                  <Card key={stat.service_id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm break-words">{stat.service_name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">{stat.category}</Badge>
                        </div>
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                          ${stat.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Total:</span>{" "}
                          <span className="font-semibold">{stat.total_bookings}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completed:</span>{" "}
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                            {stat.completed_bookings}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pending:</span>{" "}
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                            {stat.pending_bookings + stat.confirmed_bookings}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>{" "}
                          <span className="font-semibold text-green-600">${stat.total_revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total Bookings</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Potential</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((stat) => (
                      <TableRow key={stat.service_id}>
                        <TableCell className="font-medium">
                          {stat.service_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{stat.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${stat.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">{stat.total_bookings}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/20"
                          >
                            {stat.completed_bookings}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          >
                            {stat.pending_bookings + stat.confirmed_bookings}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${stat.total_revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${stat.potential_revenue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Services */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Most Popular Services</CardTitle>
            <CardDescription className="text-xs sm:text-sm">By number of bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {stats.slice(0, 5).map((stat, index) => (
                <div key={stat.service_id} className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">{stat.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm">{stat.total_bookings}</p>
                    <p className="text-xs text-muted-foreground">bookings</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top Revenue Services</CardTitle>
            <CardDescription className="text-xs sm:text-sm">By completed revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {stats
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 5)
                .map((stat, index) => (
                  <div key={stat.service_id} className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-green-500/10 text-green-600 font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words">{stat.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.completed_bookings} completed
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-green-600 text-sm">
                        ${stat.total_revenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
