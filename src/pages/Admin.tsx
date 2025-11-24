import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentsList from "@/components/admin/AppointmentsList";
import AvailabilityManager from "@/components/admin/AvailabilityManager";
import UserManagement from "@/components/admin/UserManagement";
import ActivityLog from "@/components/admin/ActivityLog";
import NotificationHistory from "@/components/admin/NotificationHistory";
import { ServiceManagement } from "@/components/admin/ServiceManagement";
import { ServiceAnalytics } from "@/components/admin/ServiceAnalytics";
import RecurringPatterns from "@/components/admin/RecurringPatterns";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
              <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
              <TabsTrigger value="availability" className="text-xs sm:text-sm">Availability</TabsTrigger>
              <TabsTrigger value="recurring" className="text-xs sm:text-sm">Recurring</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            </TabsList>

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
