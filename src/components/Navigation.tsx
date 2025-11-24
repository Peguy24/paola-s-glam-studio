import { Link } from "react-router-dom";
import { Menu, X, Sparkles, Shield, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsAdmin(false);
      setIsLoggedIn(false);
      return;
    }

    setIsLoggedIn(true);

    const { data } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    setIsAdmin(data || false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="Paola Beauty Glam" className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover ring-2 ring-primary/20" />
            <div className="flex flex-col">
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Paola Beauty Glam
              </span>
              <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Your Glamour Destination
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Home
            </Link>
            <Link to="/services" className="text-foreground hover:text-primary transition-colors font-medium">
              Services
            </Link>
            <Link to="/products" className="text-foreground hover:text-primary transition-colors font-medium">
              Shop Products
            </Link>
            {isLoggedIn && (
              <Link to="/profile" className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
                <User className="h-4 w-4" />
                Profile
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link to="/appointments" className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:shadow-[var(--shadow-glow)] transition-all">
              Book Appointment
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="block text-foreground hover:text-primary transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              to="/services"
              onClick={() => setIsOpen(false)}
              className="block text-foreground hover:text-primary transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              to="/products"
              onClick={() => setIsOpen(false)}
              className="block text-foreground hover:text-primary transition-colors font-medium"
            >
              Shop Products
            </Link>
            {isLoggedIn && (
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="block text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="block text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link
              to="/appointments"
              onClick={() => setIsOpen(false)}
              className="block px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold text-center"
            >
              Book Appointment
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
