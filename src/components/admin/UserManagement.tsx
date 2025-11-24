import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, ShieldOff, Mail, Calendar, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  user_roles: Array<{ role: string }>;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        phone,
        created_at,
        user_roles (
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      console.error("Error fetching users:", error);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove admin role",
          variant: "destructive",
        });
        console.error("Error removing admin role:", error);
        return;
      }

      toast({
        title: "Success",
        description: "Admin role removed",
      });
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add admin role",
          variant: "destructive",
        });
        console.error("Error adding admin role:", error);
        return;
      }

      toast({
        title: "Success",
        description: "Admin role granted",
      });
    }

    fetchUsers();
  };

  const isAdmin = (user: UserProfile) => {
    return user.user_roles.some((role) => role.role === "admin");
  };

  const downloadCSV = () => {
    const csvHeaders = ["Name", "Email", "Phone", "Role", "Joined Date"];
    const csvRows = users.map((user) => [
      user.full_name || "No name",
      user.email,
      user.phone || "N/A",
      isAdmin(user) ? "Admin" : "Client",
      format(new Date(user.created_at), "MMM d, yyyy"),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "User data exported to CSV",
    });
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </div>
          <Button onClick={downloadCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No users match your search" : "No users found"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const userIsAdmin = isAdmin(user);
              
              return (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {user.full_name || "No name"}
                      </h3>
                      {userIsAdmin && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {!userIsAdmin && (
                        <Badge variant="secondary">Client</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          📱 {user.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={userIsAdmin ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleAdminRole(user.id, userIsAdmin)}
                      className="w-full md:w-auto"
                    >
                      {userIsAdmin ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
