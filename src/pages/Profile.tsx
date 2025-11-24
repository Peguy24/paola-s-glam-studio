import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppointmentHistory from "@/components/profile/AppointmentHistory";
import ProfileSettings from "@/components/profile/ProfileSettings";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  My Profile
                </h1>
              </div>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                Manage your account and appointments
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appointments" className="text-sm sm:text-base">My Appointments</TabsTrigger>
              <TabsTrigger value="settings" className="text-sm sm:text-base">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <AppointmentHistory userId={user.id} />
            </TabsContent>

            <TabsContent value="settings">
              <ProfileSettings userId={user.id} userEmail={user.email} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
