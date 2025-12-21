import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Auth = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Listen to view changes from the Auth component
  useEffect(() => {
    const handleViewChange = () => {
      const authContainer = document.querySelector('[data-supabase-auth]');
      if (authContainer) {
        const signUpLink = authContainer.querySelector('a[href*="sign_up"]');
        const signInLink = authContainer.querySelector('a[href*="sign_in"]');
        
        if (signUpLink) {
          signUpLink.addEventListener('click', () => setView('sign_up'));
        }
        if (signInLink) {
          signInLink.addEventListener('click', () => setView('sign_in'));
        }
      }
    };

    const timer = setTimeout(handleViewChange, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to ImageScheduler
          </CardTitle>
          <CardDescription className="text-center">
            {view === 'sign_up' ? 'Create an account to get started' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'sign_up' && (
            <div className="mb-4 p-3 text-xs text-gray-600 bg-gray-50 rounded-md border border-gray-200">
              By signing up, you confirm that you are at least 18 years old and agree to our{' '}
              <a href="/terms-of-use" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Use
              </a>
              ,{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              , and{' '}
              <a href="/broadcaster-agreement" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Broadcaster Agreement
              </a>
              .
            </div>
          )}
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#8B5CF6",
                    brandAccent: "#7C3AED",
                  },
                },
              },
            }}
            providers={[]}
            view={view}
            onlyThirdPartyProviders={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
