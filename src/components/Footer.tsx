import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  instagram_url: string;
  facebook_url: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
}

const Footer = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    phone: "(555) 123-4567",
    email: "info@paolabeautyglam.com",
    address_line1: "123 Beauty Lane, Suite 100",
    address_line2: "City, State 12345",
    instagram_url: "https://instagram.com",
    facebook_url: "https://facebook.com",
    hours_weekday: "9:00 AM - 7:00 PM",
    hours_saturday: "10:00 AM - 6:00 PM",
    hours_sunday: "Closed",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value");

        if (error) throw error;

        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((item: { key: string; value: string }) => {
            settingsMap[item.key] = item.value;
          });

          setSettings((prev) => ({
            ...prev,
            ...settingsMap,
          }));
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Paola Beauty Glam</h3>
            <p className="text-sm text-muted-foreground">
              Your destination for professional beauty services and premium products.
            </p>
            <div className="flex gap-4">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Contact</h3>
            <ul className="space-y-3">
              {settings.phone && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{settings.phone}</span>
                </li>
              )}
              {settings.email && (
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>{settings.email}</span>
                </li>
              )}
              {(settings.address_line1 || settings.address_line2) && (
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {settings.address_line1}
                    {settings.address_line2 && <br />}
                    {settings.address_line2}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Hours</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Mon - Fri</span>
                <span>{settings.hours_weekday}</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday</span>
                <span>{settings.hours_saturday}</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span>{settings.hours_sunday}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Paola Beauty Glam. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
