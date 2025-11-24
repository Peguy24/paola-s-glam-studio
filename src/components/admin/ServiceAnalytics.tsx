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
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, TrendingUp, Calendar } from "lucide-react";

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

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From completed appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Potential Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalStats.potentialRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending & confirmed bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Service Performance
          </CardTitle>
          <CardDescription>
            Detailed statistics for each service offering
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No booking data available yet
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Top Services */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Services</CardTitle>
            <CardDescription>By number of bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.slice(0, 5).map((stat, index) => (
                <div key={stat.service_id} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{stat.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{stat.total_bookings}</p>
                    <p className="text-sm text-muted-foreground">bookings</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Revenue Services</CardTitle>
            <CardDescription>By completed revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 5)
                .map((stat, index) => (
                  <div key={stat.service_id} className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 text-green-600 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stat.service_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.completed_bookings} completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${stat.total_revenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">revenue</p>
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
