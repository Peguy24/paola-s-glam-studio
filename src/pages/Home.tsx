import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, ShoppingBag, Star, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";
import hairBefore from "@/assets/gallery/hair-before.jpg";
import hairAfter from "@/assets/gallery/hair-after.jpg";
import makeupBefore from "@/assets/gallery/makeup-before.jpg";
import makeupAfter from "@/assets/gallery/makeup-after.jpg";
import skincareBefore from "@/assets/gallery/skincare-before.jpg";
import skincareAfter from "@/assets/gallery/skincare-after.jpg";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const products = await fetchProducts(3);
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Error loading featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
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
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-soft)] opacity-50" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Premium Beauty Experience
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Unleash Your
                </span>
                <br />
                <span className="text-foreground">Inner Glamour</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                Experience luxury beauty services from hair styling to nail artistry, all in one stunning destination.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <Link to="/appointments" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)] text-base sm:text-lg px-6 sm:px-8">
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Now
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 border-2">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Shop Products
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-background" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Trusted by 500+ clients</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <img
                src={logo}
                alt="Paola Beauty Glam"
                className="relative rounded-3xl w-full object-cover shadow-2xl ring-1 ring-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-secondary/5">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm font-medium text-accent">
                <Heart className="h-4 w-4" />
                Our Story
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                Where Beauty Meets{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Artistry
                </span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At Paola Beauty Glam, we believe that beauty is not just about looking good—it's about feeling confident and empowered. Founded with a passion for luxury beauty and self-care, we curate premium products and services that celebrate individuality.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our expert team combines years of experience with the latest trends and techniques to bring you transformative beauty experiences. From our carefully selected product line to our personalized services, every detail is designed with you in mind.
              </p>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Happy Clients</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-secondary">5+</div>
                  <div className="text-sm text-muted-foreground">Years Experience</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">100%</div>
                  <div className="text-sm text-muted-foreground">Premium Quality</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-3xl blur-2xl" />
              <img
                src={logo}
                alt="Paola Beauty Glam Story"
                className="relative rounded-3xl w-full object-cover shadow-2xl ring-1 ring-border"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Transformations Gallery */}
      <section className="py-20 px-4 bg-gradient-to-b from-secondary/5 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
              <Sparkles className="h-4 w-4" />
              Our Transformations
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              See The{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Magic Happen
              </span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Real results from our expert beauty services
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Hair Transformation */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-1">
              <div className="bg-background rounded-xl overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-background/90 rounded-full text-xs font-semibold">
                      Before
                    </div>
                    <img
                      src={hairBefore}
                      alt="Hair before transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-primary/90 text-primary-foreground rounded-full text-xs font-semibold">
                      After
                    </div>
                    <img
                      src={hairAfter}
                      alt="Hair after transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">Hair Styling</h3>
                  <p className="text-sm text-muted-foreground">Glamorous volume & styling</p>
                </div>
              </div>
            </div>

            {/* Makeup Transformation */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/10 to-accent/10 p-1">
              <div className="bg-background rounded-xl overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-background/90 rounded-full text-xs font-semibold">
                      Before
                    </div>
                    <img
                      src={makeupBefore}
                      alt="Makeup before transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-secondary/90 text-primary-foreground rounded-full text-xs font-semibold">
                      After
                    </div>
                    <img
                      src={makeupAfter}
                      alt="Makeup after transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">Makeup Artistry</h3>
                  <p className="text-sm text-muted-foreground">Professional glam makeup</p>
                </div>
              </div>
            </div>

            {/* Skincare Transformation */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 p-1">
              <div className="bg-background rounded-xl overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-background/90 rounded-full text-xs font-semibold">
                      Before
                    </div>
                    <img
                      src={skincareBefore}
                      alt="Skincare before transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-accent/90 text-primary-foreground rounded-full text-xs font-semibold">
                      After
                    </div>
                    <img
                      src={skincareAfter}
                      alt="Skincare after transformation"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">Skincare Treatment</h3>
                  <p className="text-sm text-muted-foreground">Radiant glowing skin</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:shadow-[var(--shadow-glow)]">
                <Sparkles className="mr-2 h-4 w-4" />
                Explore Our Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Discover our handpicked selection of premium beauty essentials
            </p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No featured products available yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {featuredProducts.map((product) => {
                const image = product.node.images?.edges?.[0]?.node;
                const price = product.node.priceRange.minVariantPrice;
                
                return (
                  <Card key={product.node.id} className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-all border-border/50">
                    <Link to={`/product/${product.node.handle}`}>
                      <CardContent className="p-0">
                        {image ? (
                          <img
                            src={image.url}
                            alt={image.altText || product.node.title}
                            className="w-full h-72 object-cover"
                          />
                        ) : (
                          <div className="w-full h-72 bg-secondary/20 flex items-center justify-center">
                            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Link>
                    <CardFooter className="flex flex-col items-start gap-3 p-6">
                      <div className="w-full">
                        <Link to={`/product/${product.node.handle}`}>
                          <h3 className="font-semibold text-xl hover:text-primary transition-colors">
                            {product.node.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {product.node.description}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-2">
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
          
          <div className="text-center mt-12">
            <Link to="/products">
              <Button size="lg" variant="outline" className="border-2">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="container mx-auto text-center text-primary-foreground">
          <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Shine?</h2>
          <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Book your appointment today and experience the Paola Beauty Glam difference
          </p>
          <Link to="/appointments">
            <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 text-lg px-8">
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
