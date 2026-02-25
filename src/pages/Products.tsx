import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const addItem = useCartStore(state => state.addItem);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = products
    ? ["all", ...new Set(products.map((p: any) => p.category))]
    : ["all"];

  const filtered = selectedCategory === "all"
    ? products
    : products?.filter((p: any) => p.category === selectedCategory);

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      imageUrl: product.image_url,
    });
    toast.success("Added to cart", { description: `${product.name} has been added to your cart.` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-center">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Our Products
              </span>
            </h1>
            <p className="text-lg text-muted-foreground text-center mb-8">
              Premium beauty products curated just for you
            </p>
          </motion.div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !filtered?.length ? (
            <p className="text-center text-muted-foreground py-20">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product: any, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    <Link to={`/product/${product.id}`}>
                      <div className="aspect-square bg-secondary/10 overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2 capitalize">{product.category}</Badge>
                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">{product.name}</h3>
                        </Link>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-xl font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock_quantity <= 0}
                        >
                          {product.stock_quantity <= 0 ? "Out of Stock" : (
                            <>
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                      {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                        <p className="text-xs text-destructive mt-1">Only {product.stock_quantity} left!</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
