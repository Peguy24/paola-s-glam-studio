import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mail, MailOpen, Trash2, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
}

export function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
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

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "read" })
        .eq("id", id);

      if (error) throw error;
      
      setMessages(messages.map(msg => 
        msg.id === id ? { ...msg, status: "read" } : msg
      ));
      
      toast({
        title: "Success",
        description: "Message marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMessages(messages.filter(msg => msg.id !== id));
      setDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setDialogOpen(true);
    
    if (message.status === "unread") {
      markAsRead(message.id);
    }
  };

  const unreadCount = messages.filter(msg => msg.status === "unread").length;

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contact Messages</h2>
          <p className="text-muted-foreground">
            Manage customer inquiries and messages
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="default" className="text-sm">
            {unreadCount} Unread
          </Badge>
        )}
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow
                      key={message.id}
                      className={message.status === "unread" ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        {message.status === "unread" ? (
                          <Badge variant="default" className="gap-1">
                            <Mail className="h-3 w-3" />
                            New
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <MailOpen className="h-3 w-3" />
                            Read
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{message.name}</TableCell>
                      <TableCell>{message.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {message.phone || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {format(new Date(message.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMessage(message)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Contact message from {selectedMessage?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm">{selectedMessage.name}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </label>
                  <p className="text-sm">
                    {format(new Date(selectedMessage.created_at), "PPpp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedMessage.email}
                  </a>
                </div>

                {selectedMessage.phone && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <a
                      href={`tel:${selectedMessage.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedMessage.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMessage(selectedMessage.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
