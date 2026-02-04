import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, Bell, Instagram } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Products = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary via-secondary to-accent rounded-full shadow-lg">
                <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            >
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Shop Coming Soon
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8"
            >
              We're curating an exclusive collection of premium beauty products just for you
            </motion.p>

            {/* Coming Soon Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                <CardContent className="p-8 sm:p-12">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary uppercase tracking-wider">
                      Under Construction
                    </span>
                    <Sparkles className="h-5 w-5 text-secondary" />
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                    Something Beautiful is Brewing
                  </h2>

                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Our online shop is being prepared with love. Soon you'll be able to purchase 
                    professional-grade beauty products to maintain your glamorous look at home.
                  </p>

                  {/* Features Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-lg bg-background/50 border border-border">
                      <div className="text-2xl mb-2">💄</div>
                      <h3 className="font-semibold text-sm">Makeup</h3>
                      <p className="text-xs text-muted-foreground">Premium cosmetics</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border">
                      <div className="text-2xl mb-2">✨</div>
                      <h3 className="font-semibold text-sm">Skincare</h3>
                      <p className="text-xs text-muted-foreground">Glow essentials</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border">
                      <div className="text-2xl mb-2">💇‍♀️</div>
                      <h3 className="font-semibold text-sm">Haircare</h3>
                      <p className="text-xs text-muted-foreground">Salon quality</p>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="gap-2">
                      <Link to="/services">
                        <Sparkles className="h-4 w-4" />
                        Book a Service Instead
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="gap-2">
                      <Link to="/contact">
                        <Bell className="h-4 w-4" />
                        Get Notified
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social Follow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Follow us for updates and sneak peeks
              </p>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                  @paolabeautyglam
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
