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

const ITEMS_PER_PAGE = 20;

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const fetchUsers = async (reset = false) => {
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
      `, { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      console.error("Error fetching users:", error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (reset) {
      setUsers(data || []);
    } else {
      setUsers(prev => [...prev, ...(data || [])]);
    }

    setHasMore(count ? (from + (data?.length || 0)) < count : false);
    setPage(currentPage + 1);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(false);
    }
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

    fetchUsers(true);
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
    <Card className="border-2 max-w-full overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              User Management
            </CardTitle>
            <CardDescription className="text-sm">Manage user accounts and permissions</CardDescription>
          </div>
          <Button onClick={downloadCSV} variant="outline" size="sm" className="w-full sm:w-auto">
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
            className="pl-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-sm">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? "No users match your search" : "No users found"}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredUsers.map((user) => {
              const userIsAdmin = isAdmin(user);
              
              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base sm:text-lg break-words">
                        {user.full_name || "No name"}
                      </h3>
                      {userIsAdmin && (
                        <Badge variant="default" className="flex items-center gap-1 text-xs">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {!userIsAdmin && (
                        <Badge variant="secondary" className="text-xs">Client</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="break-all">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          📱 <span className="break-words">{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>Joined {format(new Date(user.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={userIsAdmin ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleAdminRole(user.id, userIsAdmin)}
                      className="w-full text-xs sm:text-sm"
                    >
                      {userIsAdmin ? (
                        <>
                          <ShieldOff className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
        
        {!loading && filteredUsers.length > 0 && hasMore && searchTerm === "" && (
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
      </CardContent>
    </Card>
  );
};

export default UserManagement;
