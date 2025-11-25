import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

interface Transformation {
  id: string;
  title: string;
  description: string | null;
  category: string;
  before_image_url: string;
  after_image_url: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function TransformationGallery() {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "hair",
    display_order: 0,
  });
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTransformations();
  }, []);

  const fetchTransformations = async () => {
    try {
      const { data, error } = await supabase
        .from("transformations")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTransformations(data || []);
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

  const uploadImage = async (file: File, type: "before" | "after") => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("transformations")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("transformations").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let beforeImageUrl = "";
      let afterImageUrl = "";

      if (editingId) {
        const existing = transformations.find((t) => t.id === editingId);
        beforeImageUrl = existing?.before_image_url || "";
        afterImageUrl = existing?.after_image_url || "";
      }

      if (beforeImage) {
        beforeImageUrl = await uploadImage(beforeImage, "before");
      }
      if (afterImage) {
        afterImageUrl = await uploadImage(afterImage, "after");
      }

      if (!beforeImageUrl || !afterImageUrl) {
        throw new Error("Both before and after images are required");
      }

      const transformationData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        before_image_url: beforeImageUrl,
        after_image_url: afterImageUrl,
        display_order: formData.display_order,
      };

      if (editingId) {
        const { error } = await supabase
          .from("transformations")
          .update(transformationData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Transformation updated successfully" });
      } else {
        const { error } = await supabase
          .from("transformations")
          .insert([transformationData]);

        if (error) throw error;
        toast({ title: "Transformation created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchTransformations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transformation?")) return;

    try {
      const { error } = await supabase.from("transformations").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Transformation deleted successfully" });
      fetchTransformations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transformation: Transformation) => {
    setEditingId(transformation.id);
    setFormData({
      title: transformation.title,
      description: transformation.description || "",
      category: transformation.category,
      display_order: transformation.display_order,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      category: "hair",
      display_order: 0,
    });
    setBeforeImage(null);
    setAfterImage(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading transformations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transformation Gallery</h2>
          <p className="text-muted-foreground">
            Manage your before/after transformation showcase
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Transformation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Transformation" : "Add New Transformation"}
              </DialogTitle>
              <DialogDescription>
                Upload before and after images to showcase transformations
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hair">Hair</SelectItem>
                    <SelectItem value="makeup">Makeup</SelectItem>
                    <SelectItem value="skincare">Skincare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="before_image">Before Image</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="before_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setBeforeImage(e.target.files?.[0] || null)
                      }
                      required={!editingId}
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="after_image">After Image</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="after_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setAfterImage(e.target.files?.[0] || null)
                      }
                      required={!editingId}
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transformations.map((transformation) => (
          <Card key={transformation.id}>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{transformation.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {transformation.description}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Before</p>
                  <img
                    src={transformation.before_image_url}
                    alt="Before"
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">After</p>
                  <img
                    src={transformation.after_image_url}
                    alt="After"
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span className="capitalize">{transformation.category}</span>
                <span>Order: {transformation.display_order}</span>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(transformation)}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(transformation.id)}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {transformations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No transformations yet. Add your first one to get started!
        </div>
      )}
    </div>
  );
}
