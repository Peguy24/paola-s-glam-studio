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
import { Plus, Pencil, Trash2, Upload, UploadCloud, X, Crop } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageCropDialog } from "./ImageCropDialog";

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
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    beforeImage: File | null;
    afterImage: File | null;
    displayOrder: number;
  }>>([]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [cropImageType, setCropImageType] = useState<"before" | "after" | null>(null);
  const [cropItemId, setCropItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransformations();
  }, []);

  const fetchTransformations = async () => {
    try {
      const { data, error } = await supabase
        .from("transformations" as any)
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTransformations((data as any) || []);
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
      .from("transformations" as any)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("transformations" as any).getPublicUrl(filePath);

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
          .from("transformations" as any)
          .update(transformationData as any)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Transformation updated successfully" });
      } else {
        const { error } = await supabase
          .from("transformations" as any)
          .insert([transformationData as any]);

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
      const { error } = await supabase.from("transformations" as any).delete().eq("id", id);

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

  const addBulkItem = () => {
    const maxOrder = transformations.length > 0
      ? Math.max(...transformations.map(t => t.display_order))
      : 0;
    
    setBulkItems([
      ...bulkItems,
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        category: "hair",
        beforeImage: null,
        afterImage: null,
        displayOrder: maxOrder + bulkItems.length + 1,
      },
    ]);
  };

  const removeBulkItem = (id: string) => {
    setBulkItems(bulkItems.filter(item => item.id !== id));
  };

  const updateBulkItem = (id: string, updates: Partial<typeof bulkItems[0]>) => {
    setBulkItems(bulkItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleCropImage = (itemId: string, type: "before" | "after", imageUrl: string) => {
    setCropItemId(itemId);
    setCropImageType(type);
    setCropImageUrl(imageUrl);
    setCropDialogOpen(true);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!cropItemId || !cropImageType) return;

    // Convert blob to File
    const file = new File([croppedBlob], `cropped-${cropImageType}.jpg`, {
      type: "image/jpeg",
    });

    // Update the bulk item with the cropped image
    if (cropImageType === "before") {
      updateBulkItem(cropItemId, { beforeImage: file });
    } else {
      updateBulkItem(cropItemId, { afterImage: file });
    }

    // Cleanup
    URL.revokeObjectURL(cropImageUrl);
    setCropDialogOpen(false);
    setCropItemId(null);
    setCropImageType(null);
    setCropImageUrl("");
  };

  const handleBulkUpload = async () => {
    if (bulkItems.length === 0) {
      toast({
        title: "No items to upload",
        description: "Please add at least one transformation pair.",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = bulkItems.filter(
      item => !item.title || !item.beforeImage || !item.afterImage
    );

    if (invalidItems.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Each item must have a title, before image, and after image.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of bulkItems) {
        try {
          const beforeImageUrl = await uploadImage(item.beforeImage!, "before");
          const afterImageUrl = await uploadImage(item.afterImage!, "after");

          const { error } = await supabase
            .from("transformations" as any)
            .insert([{
              title: item.title,
              description: item.description || null,
              category: item.category,
              before_image_url: beforeImageUrl,
              after_image_url: afterImageUrl,
              display_order: item.displayOrder,
            } as any]);

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Error uploading item ${item.title}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Bulk upload complete",
          description: `Successfully uploaded ${successCount} transformation${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }

      if (failCount === bulkItems.length) {
        toast({
          title: "Upload failed",
          description: "All items failed to upload. Please try again.",
          variant: "destructive",
        });
      }

      if (successCount > 0) {
        setBulkDialogOpen(false);
        setBulkItems([]);
        fetchTransformations();
      }
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

  if (loading) {
    return <div className="text-center py-8">Loading transformations...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Transformation Gallery</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your before/after transformation showcase
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
            setBulkDialogOpen(open);
            if (!open) setBulkItems([]);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none text-sm">
                <UploadCloud className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Bulk Upload Transformations</DialogTitle>
                <DialogDescription>
                  Upload multiple before/after pairs at once
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {bulkItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added yet. Click "Add Item" to start.
                    </div>
                  ) : (
                    bulkItems.map((item, index) => (
                      <Card key={item.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-semibold">Item #{index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBulkItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input
                                  value={item.title}
                                  onChange={(e) =>
                                    updateBulkItem(item.id, { title: e.target.value })
                                  }
                                  placeholder="e.g., Hair Styling"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={item.description}
                                  onChange={(e) =>
                                    updateBulkItem(item.id, { description: e.target.value })
                                  }
                                  placeholder="Brief description"
                                  rows={2}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <Label>Category</Label>
                                  <Select
                                    value={item.category}
                                    onValueChange={(value) =>
                                      updateBulkItem(item.id, { category: value })
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
                                  <Label>Order</Label>
                                  <Input
                                    type="number"
                                    value={item.displayOrder}
                                    onChange={(e) =>
                                      updateBulkItem(item.id, {
                                        displayOrder: parseInt(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Before Image *</Label>
                                {item.beforeImage ? (
                                  <div className="relative group rounded-lg overflow-hidden border-2 border-primary/20">
                                    <img
                                      src={URL.createObjectURL(item.beforeImage)}
                                      alt="Before preview"
                                      className="w-full h-48 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          handleCropImage(
                                            item.id,
                                            "before",
                                            URL.createObjectURL(item.beforeImage!)
                                          )
                                        }
                                      >
                                        <Crop className="h-4 w-4 mr-2" />
                                        Crop
                                      </Button>
                                      <Label
                                        htmlFor={`before-${item.id}`}
                                        className="cursor-pointer"
                                      >
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          asChild
                                        >
                                          <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Change
                                          </span>
                                        </Button>
                                      </Label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          updateBulkItem(item.id, { beforeImage: null })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                      </Button>
                                    </div>
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 rounded text-xs font-semibold">
                                      Before
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                                    <Label
                                      htmlFor={`before-${item.id}`}
                                      className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                      <Upload className="h-10 w-10 text-muted-foreground" />
                                      <div className="text-sm font-medium">Upload Before Image</div>
                                      <div className="text-xs text-muted-foreground">
                                        Click to select file
                                      </div>
                                    </Label>
                                  </div>
                                )}
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    updateBulkItem(item.id, {
                                      beforeImage: e.target.files?.[0] || null,
                                    })
                                  }
                                  className="hidden"
                                  id={`before-${item.id}`}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>After Image *</Label>
                                {item.afterImage ? (
                                  <div className="relative group rounded-lg overflow-hidden border-2 border-primary">
                                    <img
                                      src={URL.createObjectURL(item.afterImage)}
                                      alt="After preview"
                                      className="w-full h-48 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          handleCropImage(
                                            item.id,
                                            "after",
                                            URL.createObjectURL(item.afterImage!)
                                          )
                                        }
                                      >
                                        <Crop className="h-4 w-4 mr-2" />
                                        Crop
                                      </Button>
                                      <Label
                                        htmlFor={`after-${item.id}`}
                                        className="cursor-pointer"
                                      >
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          asChild
                                        >
                                          <span>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Change
                                          </span>
                                        </Button>
                                      </Label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          updateBulkItem(item.id, { afterImage: null })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                      </Button>
                                    </div>
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-semibold">
                                      After
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                                    <Label
                                      htmlFor={`after-${item.id}`}
                                      className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                      <Upload className="h-10 w-10 text-muted-foreground" />
                                      <div className="text-sm font-medium">Upload After Image</div>
                                      <div className="text-xs text-muted-foreground">
                                        Click to select file
                                      </div>
                                    </Label>
                                  </div>
                                )}
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    updateBulkItem(item.id, {
                                      afterImage: e.target.files?.[0] || null,
                                    })
                                  }
                                  className="hidden"
                                  id={`after-${item.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBulkItem}
                  disabled={uploading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkDialogOpen(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkUpload}
                    disabled={uploading || bulkItems.length === 0}
                  >
                    {uploading ? "Uploading..." : `Upload ${bulkItems.length} Item${bulkItems.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none text-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Single
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {transformations.map((transformation) => (
          <Card key={transformation.id}>
            <CardContent className="p-3 md:p-4">
              <h3 className="text-sm md:text-base font-semibold mb-2">{transformation.title}</h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
                {transformation.description}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Before</p>
                  <img
                    src={transformation.before_image_url}
                    alt="Before"
                    className="w-full h-28 md:h-32 object-cover rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">After</p>
                  <img
                    src={transformation.after_image_url}
                    alt="After"
                    className="w-full h-28 md:h-32 object-cover rounded"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span className="capitalize">{transformation.category}</span>
                <span>Order: {transformation.display_order}</span>
              </div>
            </CardContent>
            <CardFooter className="p-3 md:p-4 pt-0 flex flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(transformation)}
                className="flex-1 w-full text-xs md:text-sm"
              >
                <Pencil className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(transformation.id)}
                className="flex-1 w-full text-xs md:text-sm"
              >
                <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
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

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title={`Crop ${cropImageType === "before" ? "Before" : "After"} Image`}
      />
    </div>
  );
}
