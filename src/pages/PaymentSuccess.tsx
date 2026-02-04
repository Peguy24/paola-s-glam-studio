import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Home, Sparkles } from "lucide-react";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";
import { motion } from "framer-motion";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate("/profile");
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md border-2 text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-primary/20">
              <img src={logo} alt="Paola Beauty Glam" className="w-full h-full object-cover" />
            </div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </motion.div>

            <CardTitle className="text-2xl sm:text-3xl text-primary">
              Payment Confirmed!
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-2">
              Your booking has been successfully confirmed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-sm sm:text-base">
                  Thank you for your payment. We look forward to seeing you!
                </p>
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your email address.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link to="/profile">
                  <Calendar className="mr-2 h-4 w-4" />
                  View My Appointments
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/home">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              You will be redirected to your profile in 10 seconds...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
