 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { useToast } from "@/hooks/use-toast";
 import { Plus, Trash2, Edit2, Save, X, Clock, Percent, AlertCircle } from "lucide-react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from "@/components/ui/alert-dialog";
 import { Alert, AlertDescription } from "@/components/ui/alert";
 
 interface CancellationPolicy {
   id: string;
   hours_before: number;
   refund_percentage: number;
   display_order: number;
   is_active: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export const CancellationPolicySettings = () => {
   const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
   const [formData, setFormData] = useState({
     hours_before: 0,
     refund_percentage: 100,
     is_active: true,
   });
   const { toast } = useToast();
 
   useEffect(() => {
     fetchPolicies();
   }, []);
 
   const fetchPolicies = async () => {
     const { data, error } = await supabase
       .from("cancellation_policies")
       .select("*")
       .order("display_order", { ascending: true });
 
     if (error) {
       toast({
         title: "Error",
         description: "Failed to fetch cancellation policies",
         variant: "destructive",
       });
       return;
     }
 
     setPolicies(data || []);
     setLoading(false);
   };
 
   const openAddDialog = () => {
     setEditingPolicy(null);
     setFormData({
       hours_before: 0,
       refund_percentage: 100,
       is_active: true,
     });
     setDialogOpen(true);
   };
 
   const openEditDialog = (policy: CancellationPolicy) => {
     setEditingPolicy(policy);
     setFormData({
       hours_before: policy.hours_before,
       refund_percentage: policy.refund_percentage,
       is_active: policy.is_active,
     });
     setDialogOpen(true);
   };
 
   const handleSubmit = async () => {
     if (formData.hours_before < 0) {
       toast({
         title: "Invalid Input",
         description: "Hours must be 0 or greater",
         variant: "destructive",
       });
       return;
     }
 
     if (formData.refund_percentage < 0 || formData.refund_percentage > 100) {
       toast({
         title: "Invalid Input",
         description: "Refund percentage must be between 0 and 100",
         variant: "destructive",
       });
       return;
     }
 
     if (editingPolicy) {
       // Update existing policy
       const { error } = await supabase
         .from("cancellation_policies")
         .update({
           hours_before: formData.hours_before,
           refund_percentage: formData.refund_percentage,
           is_active: formData.is_active,
         })
         .eq("id", editingPolicy.id);
 
       if (error) {
         toast({
           title: "Error",
           description: "Failed to update policy",
           variant: "destructive",
         });
         return;
       }
 
       toast({
         title: "Success",
         description: "Policy updated successfully",
       });
     } else {
       // Create new policy
       const maxOrder = policies.length > 0 
         ? Math.max(...policies.map(p => p.display_order)) + 1 
         : 1;
 
       const { error } = await supabase
         .from("cancellation_policies")
         .insert({
           hours_before: formData.hours_before,
           refund_percentage: formData.refund_percentage,
           is_active: formData.is_active,
           display_order: maxOrder,
         });
 
       if (error) {
         toast({
           title: "Error",
           description: "Failed to create policy",
           variant: "destructive",
         });
         return;
       }
 
       toast({
         title: "Success",
         description: "Policy created successfully",
       });
     }
 
     setDialogOpen(false);
     fetchPolicies();
   };
 
   const deletePolicy = async (id: string) => {
     const { error } = await supabase
       .from("cancellation_policies")
       .delete()
       .eq("id", id);
 
     if (error) {
       toast({
         title: "Error",
         description: "Failed to delete policy",
         variant: "destructive",
       });
       return;
     }
 
     toast({
       title: "Success",
       description: "Policy deleted successfully",
     });
 
     fetchPolicies();
   };
 
   const toggleActive = async (policy: CancellationPolicy) => {
     const { error } = await supabase
       .from("cancellation_policies")
       .update({ is_active: !policy.is_active })
       .eq("id", policy.id);
 
     if (error) {
       toast({
         title: "Error",
         description: "Failed to update policy",
         variant: "destructive",
       });
       return;
     }
 
     fetchPolicies();
   };
 
   const formatPolicyDescription = (policy: CancellationPolicy) => {
     if (policy.hours_before === 0) {
       return "Less than minimum notice";
     } else if (policy.hours_before < 24) {
       return `${policy.hours_before}+ hours before`;
     } else {
       const days = Math.floor(policy.hours_before / 24);
       const hours = policy.hours_before % 24;
       if (hours === 0) {
         return `${days}+ day${days > 1 ? 's' : ''} before`;
       }
       return `${days}d ${hours}h+ before`;
     }
   };
 
   if (loading) {
     return (
       <Card className="border-2">
         <CardContent className="py-8 text-center">
           <p className="text-muted-foreground">Loading policies...</p>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-6">
       <Card className="border-2">
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Clock className="h-5 w-5" />
                 Cancellation Policy Settings
               </CardTitle>
               <CardDescription className="mt-1">
                 Configure refund rules based on how far in advance appointments are cancelled
               </CardDescription>
             </div>
             <Button onClick={openAddDialog}>
               <Plus className="h-4 w-4 mr-2" />
               Add Tier
             </Button>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {policies.length === 0 ? (
             <Alert>
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>
                 No cancellation policies configured. Add tiers to define your refund rules.
               </AlertDescription>
             </Alert>
           ) : (
             <div className="space-y-3">
               {policies.map((policy) => (
                 <div
                   key={policy.id}
                   className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                     policy.is_active 
                       ? "bg-card border-border" 
                       : "bg-muted/50 border-muted opacity-60"
                   }`}
                 >
                   <div className="flex items-center gap-6">
                     <div className="min-w-[140px]">
                       <p className="font-medium">{formatPolicyDescription(policy)}</p>
                       <p className="text-sm text-muted-foreground">
                         {policy.hours_before} hour{policy.hours_before !== 1 ? 's' : ''} minimum
                       </p>
                     </div>
                     <div className="flex items-center gap-2">
                       <Percent className="h-4 w-4 text-primary" />
                       <span className={`text-lg font-bold ${
                         policy.refund_percentage === 100 
                           ? "text-green-500" 
                           : policy.refund_percentage === 0 
                             ? "text-red-500" 
                             : "text-yellow-500"
                       }`}>
                         {policy.refund_percentage}% refund
                       </span>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2">
                       <Label htmlFor={`active-${policy.id}`} className="text-sm text-muted-foreground">
                         Active
                       </Label>
                       <Switch
                         id={`active-${policy.id}`}
                         checked={policy.is_active}
                         onCheckedChange={() => toggleActive(policy)}
                       />
                     </div>
                     <Button
                       variant="ghost"
                       size="icon"
                       onClick={() => openEditDialog(policy)}
                     >
                       <Edit2 className="h-4 w-4" />
                     </Button>
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="text-destructive">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                           <AlertDialogDescription>
                             Are you sure you want to delete this cancellation policy tier?
                             This action cannot be undone.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                           <AlertDialogAction onClick={() => deletePolicy(policy.id)}>
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
 
           {/* Policy Preview */}
           {policies.filter(p => p.is_active).length > 0 && (
             <Card className="mt-6 border border-primary/20 bg-primary/5">
               <CardHeader className="pb-3">
                 <CardTitle className="text-base">Policy Preview (as shown to clients)</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2 text-sm">
                   <p className="font-medium mb-3">Cancellation Policy:</p>
                   {policies
                     .filter(p => p.is_active)
                     .sort((a, b) => b.hours_before - a.hours_before)
                     .map((policy, index, arr) => {
                       const nextPolicy = arr[index + 1];
                       let description = "";
                       
                       if (policy.hours_before === 0) {
                         description = "No refund for last-minute cancellations";
                       } else if (!nextPolicy || nextPolicy.hours_before === 0) {
                         description = `${policy.refund_percentage}% refund if cancelled ${policy.hours_before}+ hours before`;
                       } else {
                         description = `${policy.refund_percentage}% refund if cancelled ${nextPolicy.hours_before}-${policy.hours_before} hours before`;
                       }
                       
                       return (
                         <p key={policy.id} className="text-muted-foreground">
                           • {description}
                         </p>
                       );
                     })}
                 </div>
               </CardContent>
             </Card>
           )}
         </CardContent>
       </Card>
 
       {/* Add/Edit Dialog */}
       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               {editingPolicy ? "Edit Policy Tier" : "Add Policy Tier"}
             </DialogTitle>
             <DialogDescription>
               Define the refund percentage based on cancellation timing
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="hours">Hours Before Appointment</Label>
               <Input
                 id="hours"
                 type="number"
                 min="0"
                 value={formData.hours_before}
                 onChange={(e) =>
                   setFormData({ ...formData, hours_before: parseInt(e.target.value) || 0 })
                 }
               />
               <p className="text-xs text-muted-foreground">
                 Minimum hours notice required for this refund tier (0 = no minimum)
               </p>
             </div>
             <div className="space-y-2">
               <Label htmlFor="percentage">Refund Percentage</Label>
               <Input
                 id="percentage"
                 type="number"
                 min="0"
                 max="100"
                 value={formData.refund_percentage}
                 onChange={(e) =>
                   setFormData({
                     ...formData,
                     refund_percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                   })
                 }
               />
               <p className="text-xs text-muted-foreground">
                 Percentage of the service price to refund (0-100)
               </p>
             </div>
             <div className="flex items-center gap-3">
               <Switch
                 id="is_active"
                 checked={formData.is_active}
                 onCheckedChange={(checked) =>
                   setFormData({ ...formData, is_active: checked })
                 }
               />
               <Label htmlFor="is_active">Active</Label>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setDialogOpen(false)}>
               <X className="h-4 w-4 mr-2" />
               Cancel
             </Button>
             <Button onClick={handleSubmit}>
               <Save className="h-4 w-4 mr-2" />
               {editingPolicy ? "Update" : "Create"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };