import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Calendar, Home, RefreshCw } from "lucide-react";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";
import { motion } from "framer-motion";

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-destructive/5 px-4">
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            </motion.div>

            <CardTitle className="text-2xl sm:text-3xl text-destructive">
              Paiement annulé
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-2">
              Votre paiement n'a pas été effectué
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm sm:text-base text-muted-foreground">
                Votre réservation est en attente. Vous pouvez réessayer le paiement ou nous contacter si vous avez des questions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link to="/appointments">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Réessayer
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/profile">
                  <Calendar className="mr-2 h-4 w-4" />
                  Mes rendez-vous
                </Link>
              </Button>
            </div>

            <Button asChild variant="ghost" className="w-full">
              <Link to="/home">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentCancelled;
