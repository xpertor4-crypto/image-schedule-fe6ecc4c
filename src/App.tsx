import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Journey from "./pages/Journey";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import SetupCoaches from "./pages/SetupCoaches";
import CoachDashboard from "./pages/CoachDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideNavBar = location.pathname === "/auth" || location.pathname === "/coach-dashboard";

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/leaderboard" element={<Journey />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/setup-coaches" element={<SetupCoaches />} />
        <Route path="/coach-dashboard" element={<CoachDashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNavBar && <BottomNav />}
    </>
  );
};

const App = () => {
  const [coachesSetup, setCoachesSetup] = useState(false);

  useEffect(() => {
    const setupCoaches = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('setup-coaches');
        if (!error) {
          console.log('Coaches setup completed:', data);
          setCoachesSetup(true);
        }
      } catch (error) {
        console.error('Error setting up coaches:', error);
      }
    };

    if (!coachesSetup) {
      setupCoaches();
    }
  }, [coachesSetup]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
