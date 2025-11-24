import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const AvailabilityManager = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    date: "",
    start_time: "",
    end_time: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from("availability_slots")
      .select("*")
      .gte("date", format(new Date(), "yyyy-MM-dd"))
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch availability slots",
        variant: "destructive",
      });
      return;
    }

    setSlots(data);
    setLoading(false);
  };

  const createSlot = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("availability_slots").insert({
      date: newSlot.date,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      created_by: user.id,
      is_available: true,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Availability slot created",
    });

    setNewSlot({ date: "", start_time: "", end_time: "" });
    fetchSlots();
  };

  const deleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete slot",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Slot deleted",
    });

    fetchSlots();
  };

  const toggleAvailability = async (slotId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("availability_slots")
      .update({ is_available: !currentStatus })
      .eq("id", slotId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Availability updated",
    });

    fetchSlots();
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Slot
          </CardTitle>
          <CardDescription>Add a new availability time slot</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createSlot} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Slot
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Existing Slots</CardTitle>
          <CardDescription>Manage your availability schedule</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No availability slots found
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(slot.date), "EEE, MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </div>
                      <Badge variant={slot.is_available ? "default" : "secondary"}>
                        {slot.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAvailability(slot.id, slot.is_available)}
                    >
                      {slot.is_available ? "Mark Unavailable" : "Mark Available"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSlot(slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityManager;
