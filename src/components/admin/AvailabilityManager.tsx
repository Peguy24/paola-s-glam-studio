import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Trash2, Pencil, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
  });
  const [duplicatingSlot, setDuplicatingSlot] = useState<Slot | null>(null);
  const [duplicateForm, setDuplicateForm] = useState({
    date: "",
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

  const openEditDialog = (slot: Slot) => {
    setEditingSlot(slot);
    setEditForm({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
  };

  const updateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    const { error } = await supabase
      .from("availability_slots")
      .update({
        date: editForm.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
      })
      .eq("id", editingSlot.id);

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
      description: "Slot updated successfully",
    });

    setEditingSlot(null);
    fetchSlots();
  };

  const openDuplicateDialog = (slot: Slot) => {
    setDuplicatingSlot(slot);
    setDuplicateForm({
      date: "",
    });
  };

  const duplicateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingSlot) return;

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
      date: duplicateForm.date,
      start_time: duplicatingSlot.start_time,
      end_time: duplicatingSlot.end_time,
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
      description: "Slot duplicated successfully",
    });

    setDuplicatingSlot(null);
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
                      variant="outline"
                      size="sm"
                      onClick={() => openDuplicateDialog(slot)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(slot)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Availability Slot?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this slot for {format(new Date(slot.date), "MMM d, yyyy")} at {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSlot(slot.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingSlot} onOpenChange={() => setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability Slot</DialogTitle>
            <DialogDescription>
              Update the date and time for this availability slot
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updateSlot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_date">Date</Label>
              <Input
                id="edit_date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_start_time">Start Time</Label>
              <Input
                id="edit_start_time"
                type="time"
                value={editForm.start_time}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_end_time">End Time</Label>
              <Input
                id="edit_end_time"
                type="time"
                value={editForm.end_time}
                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Update Slot
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingSlot(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicatingSlot} onOpenChange={() => setDuplicatingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Availability Slot</DialogTitle>
            <DialogDescription>
              Create a new slot with the same time for a different date
            </DialogDescription>
          </DialogHeader>
          {duplicatingSlot && (
            <form onSubmit={duplicateSlot} className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Original Slot:</p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {duplicatingSlot.start_time.slice(0, 5)} - {duplicatingSlot.end_time.slice(0, 5)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duplicate_date">New Date</Label>
                <Input
                  id="duplicate_date"
                  type="date"
                  value={duplicateForm.date}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, date: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Slot
                </Button>
                <Button type="button" variant="outline" onClick={() => setDuplicatingSlot(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailabilityManager;
