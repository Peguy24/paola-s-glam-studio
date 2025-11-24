import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import { Calendar, Clock, Plus, Trash2, Pencil, Copy, AlertTriangle, CalendarRange } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  capacity: number;
}

interface Appointment {
  id: string;
  service_type: string;
  status: string;
  client_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AvailabilityManager = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({
    date: "",
    start_time: "",
    end_time: "",
    capacity: 1,
  });
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    capacity: 1,
  });
  const [duplicatingSlot, setDuplicatingSlot] = useState<Slot | null>(null);
  const [duplicateForm, setDuplicateForm] = useState({
    date: "",
  });
  const [slotAppointments, setSlotAppointments] = useState<Appointment[]>([]);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    capacity: 1,
    days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
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
      capacity: newSlot.capacity,
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

    setNewSlot({ date: "", start_time: "", end_time: "", capacity: 1 });
    fetchSlots();
  };

  const deleteSlot = async (slotId: string) => {
    // Notify clients before deleting if there are appointments
    if (slotAppointments.length > 0) {
      try {
        await supabase.functions.invoke("notify-appointment-change", {
          body: { slotId, changeType: "cancelled" },
        });
      } catch (error) {
        console.error("Failed to send notifications:", error);
      }
    }

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
      description: slotAppointments.length > 0 
        ? "Slot deleted and clients notified" 
        : "Slot deleted",
    });

    setSlotAppointments([]);
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

  const checkSlotAppointments = async (slotId: string) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        service_type,
        status,
        client_id,
        profiles:client_id (
          full_name,
          email
        )
      `)
      .eq("slot_id", slotId)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching appointments:", error);
      return [];
    }

    return data || [];
  };

  const openEditDialog = async (slot: Slot) => {
    const appointments = await checkSlotAppointments(slot.id);
    setSlotAppointments(appointments);
    setEditingSlot(slot);
    setEditForm({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
    });
  };

  const updateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    // Notify clients if there are appointments
    if (slotAppointments.length > 0) {
      try {
        await supabase.functions.invoke("notify-appointment-change", {
          body: {
            slotId: editingSlot.id,
            changeType: "modified",
            newDate: editForm.date,
            newStartTime: editForm.start_time,
            newEndTime: editForm.end_time,
          },
        });
      } catch (error) {
        console.error("Failed to send notifications:", error);
      }
    }

    const { error } = await supabase
      .from("availability_slots")
      .update({
        date: editForm.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        capacity: editForm.capacity,
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
      description: slotAppointments.length > 0
        ? "Slot updated and clients notified"
        : "Slot updated successfully",
    });

    setEditingSlot(null);
    setSlotAppointments([]);
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
      capacity: duplicatingSlot.capacity,
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

  const createBulkSlots = async (e: React.FormEvent) => {
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

    // Get all dates in the range
    const startDate = new Date(bulkForm.start_date + 'T00:00:00');
    const endDate = new Date(bulkForm.end_date + 'T00:00:00');
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    // Filter dates based on selected days
    const dayMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    const selectedDates = allDates.filter((date) => {
      const dayName = dayMap[date.getDay() as keyof typeof dayMap];
      return bulkForm.days[dayName as keyof typeof bulkForm.days];
    });

    if (selectedDates.length === 0) {
      toast({
        title: "Error",
        description: "No dates match the selected days",
        variant: "destructive",
      });
      return;
    }

    // Create slots for all selected dates
    const slots = selectedDates.map((date) => ({
      date: format(date, "yyyy-MM-dd"),
      start_time: bulkForm.start_time,
      end_time: bulkForm.end_time,
      capacity: bulkForm.capacity,
      created_by: user.id,
      is_available: true,
    }));

    const { error } = await supabase.from("availability_slots").insert(slots);

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
      description: `Created ${slots.length} availability slots`,
    });

    setShowBulkCreate(false);
    setBulkForm({
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      capacity: 1,
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
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
            <div className="grid md:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={newSlot.capacity}
                  onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Create Slot
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowBulkCreate(true)}
                className="flex-1"
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Bulk Create
              </Button>
            </div>
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
                        {format(new Date(slot.date + 'T00:00:00'), "EEE, MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </div>
                      <Badge variant={slot.is_available ? "default" : "secondary"}>
                        {slot.is_available ? "Available" : "Unavailable"}
                      </Badge>
                      <Badge variant="outline">
                        Capacity: {slot.capacity}
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
                          onClick={async () => {
                            const appointments = await checkSlotAppointments(slot.id);
                            setSlotAppointments(appointments);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Availability Slot?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this slot for {format(new Date(slot.date + 'T00:00:00'), "MMM d, yyyy")} at {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {slotAppointments.length > 0 && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              <p className="font-semibold text-destructive">
                                Warning: {slotAppointments.length} Active Appointment{slotAppointments.length > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="space-y-2">
                              {slotAppointments.map((apt) => (
                                <div key={apt.id} className="text-sm bg-background rounded p-2">
                                  <p className="font-medium">{apt.profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {apt.service_type} - {apt.status}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-destructive mt-3">
                              Deleting this slot will affect these appointments. Consider cancelling them first.
                            </p>
                          </div>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSlot(slot.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Anyway
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
          {slotAppointments.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="font-semibold text-destructive">
                  Warning: {slotAppointments.length} Active Appointment{slotAppointments.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-2">
                {slotAppointments.map((apt) => (
                  <div key={apt.id} className="text-sm bg-background rounded p-2">
                    <p className="font-medium">{apt.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-muted-foreground text-xs">
                      {apt.service_type} - {apt.status}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-destructive mt-3">
                Changes to this slot may affect these appointments. Notify clients if needed.
              </p>
            </div>
          )}
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
            <div className="space-y-2">
              <Label htmlFor="edit_capacity">Capacity</Label>
              <Input
                id="edit_capacity"
                type="number"
                min="1"
                max="50"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 1 })}
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

      <Dialog open={showBulkCreate} onOpenChange={setShowBulkCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Create Availability Slots</DialogTitle>
            <DialogDescription>
              Create multiple slots across a date range with selected days
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createBulkSlots} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk_start_date">Start Date</Label>
                <Input
                  id="bulk_start_date"
                  type="date"
                  value={bulkForm.start_date}
                  onChange={(e) => setBulkForm({ ...bulkForm, start_date: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk_end_date">End Date</Label>
                <Input
                  id="bulk_end_date"
                  type="date"
                  value={bulkForm.end_date}
                  onChange={(e) => setBulkForm({ ...bulkForm, end_date: e.target.value })}
                  min={bulkForm.start_date || format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(bulkForm.days).map(([day, checked]) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk_${day}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        setBulkForm({
                          ...bulkForm,
                          days: { ...bulkForm.days, [day]: value === true },
                        })
                      }
                    />
                    <Label
                      htmlFor={`bulk_${day}`}
                      className="text-sm font-normal capitalize cursor-pointer"
                    >
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk_start_time">Start Time</Label>
                <Input
                  id="bulk_start_time"
                  type="time"
                  value={bulkForm.start_time}
                  onChange={(e) => setBulkForm({ ...bulkForm, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk_end_time">End Time</Label>
                <Input
                  id="bulk_end_time"
                  type="time"
                  value={bulkForm.end_time}
                  onChange={(e) => setBulkForm({ ...bulkForm, end_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk_capacity">Capacity</Label>
                <Input
                  id="bulk_capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={bulkForm.capacity}
                  onChange={(e) => setBulkForm({ ...bulkForm, capacity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <CalendarRange className="mr-2 h-4 w-4" />
                Create Slots
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowBulkCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailabilityManager;
