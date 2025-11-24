import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AppointmentsList from "@/components/admin/AppointmentsList";
import AvailabilityManager from "@/components/admin/AvailabilityManager";
import UserManagement from "@/components/admin/UserManagement";
import ActivityLog from "@/components/admin/ActivityLog";
import NotificationHistory from "@/components/admin/NotificationHistory";
import { ServiceManagement } from "@/components/admin/ServiceManagement";
import { ServiceAnalytics } from "@/components/admin/ServiceAnalytics";
import RecurringPatterns from "@/components/admin/RecurringPatterns";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Shield, Calendar, Clock, Users, Activity, Bell, Package, BarChart } from "lucide-react";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("appointments");
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to verify admin status",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
              Manage appointments and availability
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Desktop: Horizontal Tab List */}
            {!isMobile && (
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
                <TabsTrigger value="appointments" className="text-sm">
                  <Calendar className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="availability" className="text-sm">
                  <Clock className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Availability
                </TabsTrigger>
                <TabsTrigger value="recurring" className="text-sm">
                  <Clock className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Recurring
                </TabsTrigger>
                <TabsTrigger value="services" className="text-sm">
                  <Package className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-sm">
                  <BarChart className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="users" className="text-sm">
                  <Users className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-sm">
                  <Activity className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-sm">
                  <Bell className="h-4 w-4 mr-1.5 hidden lg:inline" />
                  Notifications
                </TabsTrigger>
              </TabsList>
            )}

            {/* Mobile: Dropdown Select */}
            {isMobile && (
              <div className="space-y-2">
                <Label htmlFor="admin-section" className="text-sm font-medium">
                  Select Section
                </Label>
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger id="admin-section" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="appointments">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Appointments</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="availability">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Availability</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="recurring">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Recurring Patterns</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="services">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Services</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="analytics">
                      <div className="flex items-center gap-2">
                        <BarChart className="h-4 w-4" />
                        <span>Analytics</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="users">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>User Management</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="activity">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>Activity Log</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="notifications">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <TabsContent value="appointments">
              <AppointmentsList />
            </TabsContent>

            <TabsContent value="availability">
              <AvailabilityManager />
            </TabsContent>

            <TabsContent value="recurring">
              <RecurringPatterns />
            </TabsContent>

            <TabsContent value="services">
              <ServiceManagement />
            </TabsContent>

            <TabsContent value="analytics">
              <ServiceAnalytics />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityLog />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
