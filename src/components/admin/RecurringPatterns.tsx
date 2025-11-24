import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Repeat, Plus, Trash2, Pencil, Power, PowerOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface RecurringPattern {
  id: string;
  name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  weeks_ahead: number;
}

const RecurringPatterns = () => {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPattern, setEditingPattern] = useState<RecurringPattern | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    capacity: 1,
    weeks_ahead: 4,
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
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch recurring patterns",
        variant: "destructive",
      });
      return;
    }

    setPatterns(data as RecurringPattern[] || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      name: "",
      start_time: "",
      end_time: "",
      capacity: 1,
      weeks_ahead: 4,
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
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingPattern(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (pattern: RecurringPattern) => {
    const daysObj: any = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };

    pattern.days_of_week.forEach((day) => {
      daysObj[day] = true;
    });

    setForm({
      name: pattern.name,
      start_time: pattern.start_time,
      end_time: pattern.end_time,
      capacity: pattern.capacity,
      weeks_ahead: pattern.weeks_ahead,
      days: daysObj,
    });

    setEditingPattern(pattern);
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const selectedDays = Object.entries(form.days)
      .filter(([_, checked]) => checked)
      .map(([day, _]) => day);

    if (selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day",
        variant: "destructive",
      });
      return;
    }

    const patternData = {
      name: form.name,
      days_of_week: selectedDays,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: form.capacity,
      weeks_ahead: form.weeks_ahead,
      created_by: user.id,
      is_active: true,
    };

    if (editingPattern) {
      const { error } = await supabase
        .from("recurring_patterns")
        .update(patternData)
        .eq("id", editingPattern.id);

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
        description: "Pattern updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("recurring_patterns")
        .insert(patternData);

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
        description: "Pattern created successfully",
      });
    }

    setShowCreateDialog(false);
    fetchPatterns();
  };

  const toggleActive = async (pattern: RecurringPattern) => {
    const { error } = await supabase
      .from("recurring_patterns")
      .update({ is_active: !pattern.is_active })
      .eq("id", pattern.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update pattern",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: pattern.is_active ? "Pattern deactivated" : "Pattern activated",
    });

    fetchPatterns();
  };

  const deletePattern = async (patternId: string) => {
    const { error } = await supabase
      .from("recurring_patterns")
      .delete()
      .eq("id", patternId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete pattern",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Pattern deleted successfully",
    });

    fetchPatterns();
  };

  const runPatternNow = async () => {
    try {
      const { error } = await supabase.functions.invoke("process-recurring-patterns");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Recurring patterns processed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process patterns",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Recurring Patterns
              </CardTitle>
              <CardDescription>
                Automatically create slots based on recurring schedules
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={runPatternNow} variant="outline">
                Run Now
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pattern
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading patterns...</div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recurring patterns found. Create one to automatically generate slots.
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{pattern.name}</h3>
                      <Badge variant={pattern.is_active ? "default" : "secondary"}>
                        {pattern.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pattern.start_time.slice(0, 5)} - {pattern.end_time.slice(0, 5)} • 
                      Capacity: {pattern.capacity} • 
                      {pattern.weeks_ahead} weeks ahead
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {pattern.days_of_week.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs capitalize">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(pattern)}
                    >
                      {pattern.is_active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(pattern)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Pattern?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{pattern.name}"? This won't affect existing slots.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePattern(pattern.id)}
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPattern ? "Edit" : "Create"} Recurring Pattern
            </DialogTitle>
            <DialogDescription>
              Set up a recurring schedule to automatically create availability slots
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pattern_name">Pattern Name</Label>
              <Input
                id="pattern_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Weekly Business Hours"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(form.days).map(([day, checked]) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pattern_${day}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        setForm({
                          ...form,
                          days: { ...form.days, [day]: value === true },
                        })
                      }
                    />
                    <Label
                      htmlFor={`pattern_${day}`}
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
                <Label htmlFor="pattern_start_time">Start Time</Label>
                <Input
                  id="pattern_start_time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern_end_time">End Time</Label>
                <Input
                  id="pattern_end_time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern_capacity">Capacity</Label>
                <Input
                  id="pattern_capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pattern_weeks_ahead">Weeks Ahead</Label>
              <Input
                id="pattern_weeks_ahead"
                type="number"
                min="1"
                max="52"
                value={form.weeks_ahead}
                onChange={(e) => setForm({ ...form, weeks_ahead: parseInt(e.target.value) || 4 })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Number of weeks in advance to create slots
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingPattern ? "Update" : "Create"} Pattern
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
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

export default RecurringPatterns;