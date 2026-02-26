import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VariantForm {
  name: string;
  price: string;
  stock_quantity: string;
  is_active: boolean;
}

const emptyVariant: VariantForm = { name: "", price: "", stock_quantity: "0", is_active: true };

export const VariantManagement = ({ productId }: { productId: string }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VariantForm>(emptyVariant);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: variants, isLoading } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: productId,
        name: form.name,
        price: form.price ? parseFloat(form.price) : null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("product_variants").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_variants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success(editingId ? "Variante mise à jour" : "Variante ajoutée");
      setForm(emptyVariant);
      setEditingId(null);
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success("Variante supprimée");
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const startEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      price: v.price ? String(v.price) : "",
      stock_quantity: String(v.stock_quantity),
      is_active: v.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyVariant);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <h4 className="font-medium text-sm">Variantes (taille, couleur...)</h4>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        variants && variants.length > 0 && (
          <div className="space-y-2">
            {variants.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between gap-2 text-sm bg-background rounded p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{v.name}</span>
                  {v.price && <Badge variant="secondary">${Number(v.price).toFixed(2)}</Badge>}
                  <Badge variant="outline">Stock: {v.stock_quantity}</Badge>
                  {!v.is_active && <Badge variant="destructive">Inactif</Badge>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(v)}>Modifier</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(v.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="space-y-2 pt-2 border-t">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Nom</Label>
            <Input placeholder="Ex: Rouge, XL..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Prix (optionnel)</Label>
            <Input type="number" step="0.01" placeholder="Prix" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Stock</Label>
            <Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} className="h-8 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2">
            {editingId && <Button variant="outline" size="sm" onClick={cancelEdit}>Annuler</Button>}
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              <Plus className="h-3 w-3 mr-1" />
              {editingId ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
