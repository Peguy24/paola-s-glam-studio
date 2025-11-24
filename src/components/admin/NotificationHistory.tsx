import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface NotificationRecord {
  id: string;
  appointment_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  notification_type: string;
  change_type: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  metadata: any;
}

const NotificationHistory = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_history")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "both":
        return (
          <div className="flex gap-1">
            <Mail className="h-4 w-4" />
            <MessageSquare className="h-4 w-4" />
          </div>
        );
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "sent") {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getChangeTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      cancelled: "bg-red-500",
      modified: "bg-blue-500",
      reminder: "bg-yellow-500",
      confirmation: "bg-green-500",
    };

    return (
      <Badge className={colors[type] || "bg-gray-500"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading notification history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track all sent emails and SMS messages
          </p>
        </CardHeader>
      </Card>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No notifications sent yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.notification_type)}
                        <span className="font-medium text-sm">
                          {notification.notification_type.toUpperCase()}
                        </span>
                      </div>
                      {getChangeTypeBadge(notification.change_type)}
                      {getStatusBadge(notification.status)}
                    </div>

                    <div className="space-y-1 text-sm">
                      {notification.recipient_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {notification.recipient_email}
                          </span>
                        </div>
                      )}
                      {notification.recipient_phone && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {notification.recipient_phone}
                          </span>
                        </div>
                      )}
                    </div>

                    {notification.metadata && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <div className="font-medium mb-1">Details:</div>
                        {notification.metadata.service_type && (
                          <div>Service: {notification.metadata.service_type}</div>
                        )}
                        {notification.metadata.original_date && (
                          <div>
                            Original: {notification.metadata.original_date} at{" "}
                            {notification.metadata.original_time}
                          </div>
                        )}
                        {notification.metadata.new_date && (
                          <div>
                            New: {notification.metadata.new_date} at{" "}
                            {notification.metadata.new_start_time} -{" "}
                            {notification.metadata.new_end_time}
                          </div>
                        )}
                      </div>
                    )}

                    {notification.error_message && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        Error: {notification.error_message}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground text-right">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(notification.sent_at), "MMM d, yyyy")}
                    <br />
                    {format(new Date(notification.sent_at), "h:mm a")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationHistory;
