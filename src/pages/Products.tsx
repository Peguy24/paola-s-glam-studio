import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2 } from "lucide-react";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const Products = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts(50);
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleAddToCart = (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;

    const cartItem = {
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions
    };

    addItem(cartItem);
    toast.success("Added to cart", {
      description: `${product.node.title} has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Shop Our Products
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Premium beauty products curated for you
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <Card className="border-2 max-w-2xl mx-auto">
              <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-full">
                  <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-3">No Products Found</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  Your store doesn't have any products yet. Create your first product to get started!
                </p>
                <div className="p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Tell me what product you'd like to create, including the name and price.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const image = product.node.images?.edges?.[0]?.node;
                const price = product.node.priceRange.minVariantPrice;
                
                return (
                  <Card key={product.node.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Link to={`/product/${product.node.handle}`}>
                      <CardContent className="p-0">
                        {image ? (
                          <img
                            src={image.url}
                            alt={image.altText || product.node.title}
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <div className="w-full h-64 bg-secondary/20 flex items-center justify-center">
                            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Link>
                    <CardFooter className="flex flex-col items-start gap-3 p-4">
                      <div className="w-full">
                        <Link to={`/product/${product.node.handle}`}>
                          <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                            {product.node.title}
                          </h3>
                        </Link>
                        <p className="text-xl font-bold text-primary mt-1">
                          {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
