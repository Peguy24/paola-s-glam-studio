import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Phone, Mail, MapPin, Clock, Instagram, Facebook } from "lucide-react";

interface Settings {
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

export const SiteSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    instagram_url: "",
    facebook_url: "",
    hours_weekday: "",
    hours_saturday: "",
    hours_sunday: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((item: { key: string; value: string }) => {
        settingsMap[item.key] = item.value;
      });

      setSettings({
        phone: settingsMap.phone || "",
        email: settingsMap.email || "",
        address_line1: settingsMap.address_line1 || "",
        address_line2: settingsMap.address_line2 || "",
        instagram_url: settingsMap.instagram_url || "",
        facebook_url: settingsMap.facebook_url || "",
        hours_weekday: settingsMap.hours_weekday || "",
        hours_saturday: settingsMap.hours_saturday || "",
        hours_sunday: settingsMap.hours_sunday || "",
      });
    } catch (error: any) {
      toast.error("Failed to load settings", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: update.value, updated_by: update.updated_by, updated_at: update.updated_at })
          .eq("key", update.key);

        if (error) throw error;
      }

      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Site Settings</h2>
          <p className="text-muted-foreground">Manage footer contact information</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>Phone and email displayed in footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="info@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Address
            </CardTitle>
            <CardDescription>Location displayed in footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={settings.address_line1}
                onChange={(e) => handleChange("address_line1", e.target.value)}
                placeholder="123 Beauty Lane, Suite 100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={settings.address_line2}
                onChange={(e) => handleChange("address_line2", e.target.value)}
                placeholder="City, State 12345"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-primary" />
              Social Media
            </CardTitle>
            <CardDescription>Social media links in footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram_url" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram URL
              </Label>
              <Input
                id="instagram_url"
                value={settings.instagram_url}
                onChange={(e) => handleChange("instagram_url", e.target.value)}
                placeholder="https://instagram.com/youraccount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook_url" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook URL
              </Label>
              <Input
                id="facebook_url"
                value={settings.facebook_url}
                onChange={(e) => handleChange("facebook_url", e.target.value)}
                placeholder="https://facebook.com/youraccount"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Business Hours
            </CardTitle>
            <CardDescription>Operating hours displayed in footer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours_weekday">Monday - Friday</Label>
              <Input
                id="hours_weekday"
                value={settings.hours_weekday}
                onChange={(e) => handleChange("hours_weekday", e.target.value)}
                placeholder="9:00 AM - 7:00 PM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_saturday">Saturday</Label>
              <Input
                id="hours_saturday"
                value={settings.hours_saturday}
                onChange={(e) => handleChange("hours_saturday", e.target.value)}
                placeholder="10:00 AM - 6:00 PM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_sunday">Sunday</Label>
              <Input
                id="hours_sunday"
                value={settings.hours_sunday}
                onChange={(e) => handleChange("hours_sunday", e.target.value)}
                placeholder="Closed"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SiteSettings;
