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
import { TransformationGallery } from "@/components/admin/TransformationGallery";
import { ContactMessages } from "@/components/admin/ContactMessages";
import { RatingsManagement } from "@/components/admin/RatingsManagement";
import { SiteSettings } from "@/components/admin/SiteSettings";
 import { CancellationPolicySettings } from "@/components/admin/CancellationPolicySettings";
import { useToast } from "@/hooks/use-toast";
 import { Shield, Calendar, Clock, Users, Activity, Bell, Package, BarChart, Image, Mail, Star, Settings, RefreshCcw } from "lucide-react";
 import { AdminGuideGenerator } from "@/components/admin/AdminGuideGenerator";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("appointments");
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
      
      <div className="pt-24 sm:pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-sm sm:text-base lg:text-xl text-muted-foreground">
              Manage appointments and availability
            </p>
             <div className="mt-4">
               <AdminGuideGenerator />
             </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Desktop: Horizontal Tab List (lg and above) */}
            <div className="hidden lg:block">
              <TabsList className="grid w-full grid-cols-6 xl:grid-cols-12 gap-1">
                <TabsTrigger value="appointments" className="text-xs xl:text-sm">
                  <Calendar className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="availability" className="text-xs xl:text-sm">
                  <Clock className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Availability
                </TabsTrigger>
                <TabsTrigger value="recurring" className="text-xs xl:text-sm">
                  <Clock className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Recurring
                </TabsTrigger>
                <TabsTrigger value="services" className="text-xs xl:text-sm">
                  <Package className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="gallery" className="text-xs xl:text-sm">
                  <Image className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Gallery
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs xl:text-sm">
                  <Mail className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="ratings" className="text-xs xl:text-sm">
                  <Star className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Ratings
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs xl:text-sm">
                  <BarChart className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs xl:text-sm">
                  <Users className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs xl:text-sm">
                  <Activity className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs xl:text-sm">
                  <Bell className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs xl:text-sm">
                  <Settings className="h-4 w-4 mr-1.5 hidden xl:inline" />
                  Settings
                </TabsTrigger>
                 <TabsTrigger value="cancellation" className="text-xs xl:text-sm">
                   <RefreshCcw className="h-4 w-4 mr-1.5 hidden xl:inline" />
                   Cancellation
                 </TabsTrigger>
              </TabsList>
            </div>

            {/* Tablet & Mobile: Dropdown Select */}
            <div className="lg:hidden space-y-2">
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
                    <SelectItem value="gallery">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        <span>Gallery</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="messages">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Messages</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ratings">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        <span>Ratings</span>
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
                    <SelectItem value="settings">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Site Settings</span>
                      </div>
                    </SelectItem>
                     <SelectItem value="cancellation">
                       <div className="flex items-center gap-2">
                         <RefreshCcw className="h-4 w-4" />
                         <span>Cancellation Policy</span>
                       </div>
                     </SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <TabsContent value="gallery">
              <TransformationGallery />
            </TabsContent>

            <TabsContent value="messages">
              <ContactMessages />
            </TabsContent>

            <TabsContent value="ratings">
              <RatingsManagement />
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

            <TabsContent value="settings">
              <SiteSettings />
            </TabsContent>
 
             <TabsContent value="cancellation">
               <CancellationPolicySettings />
             </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
