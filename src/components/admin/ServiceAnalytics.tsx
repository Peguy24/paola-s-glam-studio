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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, TrendingUp, Calendar, Download, FileText, Loader2 } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type PeriodType = "day" | "week" | "month";

interface Appointment {
  id: string;
  status: string;
  created_at: string;
  service: {
    id: string;
    name: string;
    price: number;
    category: string;
  } | null;
  slot: {
    date: string;
  };
}

interface PeriodData {
  period: string;
  bookings: number;
  revenue: number;
  completed: number;
  cancelled: number;
}

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    potentialRevenue: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (appointments.length > 0) {
      calculatePeriodData();
      calculateServiceStats();
    }
  }, [appointments, periodType]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          status,
          created_at,
          service:service_id (
            id,
            name,
            price,
            category
          ),
          slot:slot_id (
            date
          )
        `);

      if (error) throw error;
      setAppointments(data as unknown as Appointment[]);
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

  const calculatePeriodData = () => {
    const now = new Date();
    let intervals: Date[];
    let getLabel: (date: Date) => string;
    let getPeriodStart: (date: Date) => Date;

    switch (periodType) {
      case "day":
        intervals = eachDayOfInterval({ start: subDays(now, 13), end: now });
        getLabel = (date) => format(date, "MMM d");
        getPeriodStart = startOfDay;
        break;
      case "week":
        intervals = eachWeekOfInterval({ start: subWeeks(now, 11), end: now });
        getLabel = (date) => format(date, "MMM d");
        getPeriodStart = startOfWeek;
        break;
      case "month":
        intervals = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
        getLabel = (date) => format(date, "MMM yyyy");
        getPeriodStart = startOfMonth;
        break;
    }

    const data: PeriodData[] = intervals.map((intervalStart, index) => {
      const intervalEnd = index < intervals.length - 1 
        ? intervals[index + 1] 
        : periodType === "day" 
          ? new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000)
          : periodType === "week"
            ? new Date(intervalStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(intervalStart.getFullYear(), intervalStart.getMonth() + 1, 1);

      const periodAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.slot?.date || apt.created_at);
        return isWithinInterval(aptDate, { start: intervalStart, end: intervalEnd });
      });

      const completed = periodAppointments.filter(a => a.status === "completed");
      const cancelled = periodAppointments.filter(a => a.status === "cancelled");

      return {
        period: getLabel(intervalStart),
        bookings: periodAppointments.length,
        revenue: completed.reduce((sum, apt) => sum + (apt.service?.price || 0), 0),
        completed: completed.length,
        cancelled: cancelled.length,
      };
    });

    setPeriodData(data);
  };

  const calculateServiceStats = () => {
    const serviceMap = new Map<string, ServiceStats>();

    appointments.forEach((apt) => {
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
  };

  const getPeriodLabel = () => {
    switch (periodType) {
      case "day": return "Last 14 Days";
      case "week": return "Last 12 Weeks";
      case "month": return "Last 12 Months";
    }
  };

  const exportPeriodToCSV = () => {
    setExporting(true);
    try {
      const headers = ["Period", "Total Bookings", "Completed", "Cancelled", "Revenue"];
      const rows = periodData.map(d => [
        d.period,
        d.bookings,
        d.completed,
        d.cancelled,
        `$${d.revenue.toFixed(2)}`
      ]);

      const totalRevenue = periodData.reduce((sum, d) => sum + d.revenue, 0);
      const totalBookings = periodData.reduce((sum, d) => sum + d.bookings, 0);

      const csvContent = [
        `${getPeriodLabel()} Report`,
        "",
        headers.join(","),
        ...rows.map(row => row.join(",")),
        "",
        "Summary",
        `Total Bookings,${totalBookings}`,
        `Total Revenue,$${totalRevenue.toFixed(2)}`,
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `analytics_${periodType}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();

      toast({ title: "Success", description: "Report exported to CSV" });
    } finally {
      setExporting(false);
    }
  };

  const exportPeriodToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text(`Analytics Report - ${getPeriodLabel()}`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 28);

      const totalRevenue = periodData.reduce((sum, d) => sum + d.revenue, 0);
      const totalBookings = periodData.reduce((sum, d) => sum + d.bookings, 0);
      const totalCompleted = periodData.reduce((sum, d) => sum + d.completed, 0);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Summary", 14, 40);
      doc.setFontSize(10);
      doc.text(`Total Bookings: ${totalBookings}`, 14, 48);
      doc.text(`Completed Appointments: ${totalCompleted}`, 14, 55);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, 62);

      autoTable(doc, {
        startY: 72,
        head: [["Period", "Bookings", "Completed", "Cancelled", "Revenue"]],
        body: periodData.map(d => [
          d.period,
          d.bookings,
          d.completed,
          d.cancelled,
          `$${d.revenue.toFixed(2)}`
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 245, 250] },
      });

      // Add service breakdown
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.setFontSize(12);
      doc.text("Service Performance", 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Service", "Category", "Bookings", "Completed", "Revenue"]],
        body: stats.slice(0, 10).map(s => [
          s.service_name,
          s.category,
          s.total_bookings,
          s.completed_bookings,
          `$${s.total_revenue.toFixed(2)}`
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 8 },
      });

      doc.save(`analytics_${periodType}_${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({ title: "Success", description: "Report exported to PDF" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From completed appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.potentialRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Pending & confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector & Charts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue & Bookings Over Time
              </CardTitle>
              <CardDescription>{getPeriodLabel()}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="day" className="text-xs sm:text-sm">Daily</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs sm:text-sm">Weekly</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs sm:text-sm">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue</h4>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11 }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bookings Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Bookings</h4>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} name="Cancelled" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button onClick={exportPeriodToCSV} variant="outline" size="sm" disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
            <Button onClick={exportPeriodToPDF} variant="outline" size="sm" disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Breakdown - {getPeriodLabel()}</CardTitle>
          <CardDescription>Appointments and revenue by {periodType}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="block lg:hidden space-y-3">
            {periodData.map((data) => (
              <Card key={data.period} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{data.period}</span>
                    <span className="text-primary font-bold">${data.revenue.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      <span className="font-semibold">{data.bookings}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Done:</span>{" "}
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                        {data.completed}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cancel:</span>{" "}
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">
                        {data.cancelled}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Total Bookings</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodData.map((data) => (
                  <TableRow key={data.period}>
                    <TableCell className="font-medium">{data.period}</TableCell>
                    <TableCell className="text-right">{data.bookings}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        {data.completed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">
                        {data.cancelled}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      ${data.revenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Service Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Performance</CardTitle>
          <CardDescription>Statistics by service</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No booking data available</p>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block lg:hidden space-y-3">
                {stats.map((stat) => (
                  <Card key={stat.service_id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-medium text-sm">{stat.service_name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">{stat.category}</Badge>
                        </div>
                        <span className="text-primary font-semibold">${stat.price.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Total:</span> <strong>{stat.total_bookings}</strong></div>
                        <div><span className="text-muted-foreground">Completed:</span> <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">{stat.completed_bookings}</Badge></div>
                        <div><span className="text-muted-foreground">Revenue:</span> <strong className="text-green-600">${stat.total_revenue.toFixed(2)}</strong></div>
                        <div><span className="text-muted-foreground">Potential:</span> <span className="text-muted-foreground">${stat.potential_revenue.toFixed(2)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Potential</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((stat) => (
                      <TableRow key={stat.service_id}>
                        <TableCell className="font-medium">{stat.service_name}</TableCell>
                        <TableCell><Badge variant="outline">{stat.category}</Badge></TableCell>
                        <TableCell className="text-right">${stat.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">{stat.total_bookings}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">{stat.completed_bookings}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">${stat.total_revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${stat.potential_revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
