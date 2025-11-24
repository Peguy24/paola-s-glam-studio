import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

const Products = () => {
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

          <Card className="border-2 max-w-2xl mx-auto">
            <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-full">
                <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3">Coming Soon!</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Our online shop is currently being set up with Shopify. Soon you'll be able to purchase your favorite beauty products directly from our website.
              </p>
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  In the meantime, visit us in-store or call us to purchase products
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Products;
