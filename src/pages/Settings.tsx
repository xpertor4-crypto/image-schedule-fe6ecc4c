import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, User as UserIcon, Globe, ArrowLeft, Palette, Copy, Check, Edit2, Save, LayoutGrid, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

const Settings = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [useCalendarView, setUseCalendarView] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkCoachRole();
    }
    // Load view preference
    const savedView = localStorage.getItem('useCalendarView');
    setUseCalendarView(savedView === 'true');
  }, [user]);

  const checkCoachRole = async () => {
    if (!user) return;
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'coach');

    setIsCoach(roles && roles.length > 0);
  };

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setDisplayName(data.display_name || user.email || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUserId = async () => {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success(t('settings.userIdCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewModeToggle = (checked: boolean) => {
    setUseCalendarView(checked);
    localStorage.setItem('useCalendarView', String(checked));
    toast.success(checked ? 'Calendar Grid View enabled' : 'Modern Task View enabled');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t('settings.signedOut'));
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{t('navigation.settings')}</h1>
        </div>

        {/* Profile Section */}
        <div className="bg-card rounded-3xl p-6 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">Profile</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  loadProfile();
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? 'Cancel' : <><Edit2 className="w-4 h-4 mr-2" />Edit</>}
            </Button>
          </div>
          
          {!isEditing ? (
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {displayName?.[0]?.toUpperCase() || user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-card-foreground">
                  {displayName || user.email}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {displayName?.[0]?.toUpperCase() || user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          )}
          
          {/* User ID Section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-card-foreground mb-1">
                  {t('settings.userId')}
                </h3>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {user.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyUserId}
                className="shrink-0 ml-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="bg-card rounded-3xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">{t('settings.theme.title')}</h3>
          </div>
          <ThemeToggle />
        </div>

        {/* Language Section */}
        <div className="bg-card rounded-3xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">{t('settings.language')}</h3>
          </div>
          <LanguageSwitcher />
        </div>

        {/* View Mode Section */}
        <div className="bg-card rounded-3xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-3">
            <LayoutGrid className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">View Mode</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-card-foreground">Calendar Grid View</p>
              <p className="text-sm text-muted-foreground">Use the traditional calendar grid interface instead of the modern task view</p>
            </div>
            <Switch
              checked={useCalendarView}
              onCheckedChange={handleViewModeToggle}
            />
          </div>
        </div>

        {/* Coach Dashboard Section - Only visible for coaches */}
        {isCoach && (
          <div className="bg-card rounded-3xl p-6 shadow-sm mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Video className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">Coach Tools</h3>
            </div>
            <Button
              onClick={() => navigate('/coach-dashboard')}
              className="w-full"
            >
              <Video className="w-4 h-4 mr-2" />
              Open Coach Dashboard
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Upload videos and manage your live streams
            </p>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="bg-card rounded-3xl p-6 shadow-sm">
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            {t('settings.signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
