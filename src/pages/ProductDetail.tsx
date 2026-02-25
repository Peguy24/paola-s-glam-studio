import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const addItem = useCartStore(state => state.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", handle)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: variants } = useQuery({
    queryKey: ["product-variants", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", handle!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!handle,
  });

  const handleAddToCart = () => {
    if (!product) return;

    const price = selectedVariant ? Number(selectedVariant.price || product.price) : Number(product.price);
    const stock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;

    if (stock <= 0) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price,
      quantity: 1,
      imageUrl: product.image_url,
    });
    toast.success("Added to cart", { description: `${product.name} has been added to your cart.` });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-20 px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-20 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/products"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Button></Link>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant ? Number(selectedVariant.price || product.price) : Number(product.price);
  const currentStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4">
        <div className="container mx-auto">
          <Link to="/products">
            <Button variant="ghost" className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Button>
          </Link>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            <Card>
              <CardContent className="p-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-auto rounded-lg" />
                ) : (
                  <div className="w-full aspect-square bg-secondary/20 flex items-center justify-center rounded-lg">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <Badge variant="secondary" className="mb-2 capitalize">{product.category}</Badge>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{product.name}</h1>
                <p className="text-xl sm:text-2xl font-bold text-primary">${currentPrice.toFixed(2)}</p>
              </div>

              {product.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Description</h2>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {variants && variants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Options</h3>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v: any) => (
                      <Badge
                        key={v.id}
                        variant={selectedVariant?.id === v.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      >
                        {v.name}
                        {v.stock_quantity <= 0 && " (Out of Stock)"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {currentStock > 0 ? (
                  currentStock <= 5 ? <span className="text-destructive">Only {currentStock} left in stock!</span> : <span>{currentStock} in stock</span>
                ) : (
                  <span className="text-destructive">Out of stock</span>
                )}
              </div>

              <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={currentStock <= 0}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {currentStock > 0 ? "Add to Cart" : "Out of Stock"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
