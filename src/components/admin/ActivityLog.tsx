import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Shield, ShieldOff, Calendar, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  action_description: string;
  target_user_id: string | null;
  target_id: string | null;
  metadata: any;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
  target_profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select(`
        id,
        user_id,
        action_type,
        action_description,
        target_user_id,
        target_id,
        metadata,
        created_at,
        profiles!activity_logs_user_id_fkey (
          email,
          full_name
        ),
        target_profiles:profiles!activity_logs_target_user_id_fkey (
          email,
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
      console.error("Error fetching activity logs:", error);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "role_granted":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "role_revoked":
        return <ShieldOff className="h-4 w-4 text-red-600" />;
      case "appointment_updated":
        return <Calendar className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" => {
    switch (actionType) {
      case "role_granted":
        return "default";
      case "role_revoked":
        return "destructive";
      case "appointment_updated":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card className="border-2 max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
          Activity Log
        </CardTitle>
        <CardDescription className="text-sm">Recent admin actions and system events</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-sm">Loading activity log...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No activity recorded yet
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-2 sm:pr-4">
            <div className="space-y-2 sm:space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action_type)}
                  </div>
                  
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionBadgeVariant(log.action_type)} className="text-xs">
                            {formatActionType(log.action_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        
                        <p className="text-xs sm:text-sm font-medium break-words">
                          {log.action_description}
                        </p>
                        
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {log.profiles && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="break-words">
                                By: {log.profiles.full_name || log.profiles.email}
                              </span>
                            </div>
                          )}
                          
                          {log.target_profiles && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="break-words">
                                Target: {log.target_profiles.full_name || log.target_profiles.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded break-words">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
