import { Link } from "react-router-dom";
import { NavLink } from "./NavLink";
import { Menu, X, Sparkles, Shield, User, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CartDrawer } from "./CartDrawer";
import logo from "@/assets/paola-beauty-glam-logo.jpeg";

const navLinkClass = "relative text-foreground hover:text-primary transition-colors font-medium after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left";
const activeNavLinkClass = "text-primary after:scale-x-100 after:origin-bottom-left";

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
          <div className="hidden lg:flex items-center gap-6">
            <NavLink to="/" className={navLinkClass} activeClassName={activeNavLinkClass} end>
              Home
            </NavLink>
            <NavLink to="/services" className={navLinkClass} activeClassName={activeNavLinkClass}>
              Services
            </NavLink>
            <NavLink to="/products" className={navLinkClass} activeClassName={activeNavLinkClass}>
              Shop Products
            </NavLink>
            <NavLink to="/contact" className={navLinkClass} activeClassName={activeNavLinkClass}>
              Contact
            </NavLink>
            <NavLink to="/reviews" className={`${navLinkClass} flex items-center gap-1`} activeClassName={activeNavLinkClass}>
              <Star className="h-4 w-4" />
              Reviews
            </NavLink>
            {isLoggedIn && (
              <NavLink to="/profile" className={`${navLinkClass} flex items-center gap-1`} activeClassName={activeNavLinkClass}>
                <User className="h-4 w-4" />
                Profile
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={`${navLinkClass} flex items-center gap-1`} activeClassName={activeNavLinkClass}>
                <Shield className="h-4 w-4" />
                Admin
              </NavLink>
            )}
            <CartDrawer />
            <Link to="/appointments" className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold hover:shadow-[var(--shadow-glow)] transition-all">
              Book Appointment
            </Link>
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="lg:hidden flex items-center gap-2">
            <CartDrawer />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-foreground hover:text-primary"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 space-y-1 border-t border-border">
            <NavLink
              to="/"
              onClick={() => setIsOpen(false)}
              className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium"
              activeClassName="text-primary bg-primary/10"
              end
            >
              Home
            </NavLink>
            <NavLink
              to="/services"
              onClick={() => setIsOpen(false)}
              className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium"
              activeClassName="text-primary bg-primary/10"
            >
              Services
            </NavLink>
            <NavLink
              to="/products"
              onClick={() => setIsOpen(false)}
              className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium"
              activeClassName="text-primary bg-primary/10"
            >
              Shop Products
            </NavLink>
            <NavLink
              to="/contact"
              onClick={() => setIsOpen(false)}
              className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium"
              activeClassName="text-primary bg-primary/10"
            >
              Contact
            </NavLink>
            <NavLink
              to="/reviews"
              onClick={() => setIsOpen(false)}
              className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center gap-1"
              activeClassName="text-primary bg-primary/10"
            >
              <Star className="h-4 w-4" />
              Reviews
            </NavLink>
            {isLoggedIn && (
              <NavLink
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center gap-1"
                activeClassName="text-primary bg-primary/10"
              >
                <User className="h-4 w-4" />
                Profile
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="block py-2 px-3 rounded-lg text-foreground hover:text-primary hover:bg-primary/5 transition-all font-medium flex items-center gap-1"
                activeClassName="text-primary bg-primary/10"
              >
                <Shield className="h-4 w-4" />
                Admin
              </NavLink>
            )}
            <Link
              to="/appointments"
              onClick={() => setIsOpen(false)}
              className="block mt-3 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full font-semibold text-center"
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
