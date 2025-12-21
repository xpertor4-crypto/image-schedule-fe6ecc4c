import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Image Scheduler
            </h1>
            <p className="text-gray-600">
              {view === "sign_in" ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#9b87f5",
                    brandAccent: "#7E69AB",
                  },
                },
              },
            }}
            providers={[]}
            view={view}
            showLinks={false}
          />

          {view === "sign_up" && (
            <div className="mt-4 mb-2 text-xs text-gray-600 text-center">
              By signing up, you confirm that you are at least 18 years old and agree to our{" "}
              <Link to="/terms-of-use" className="text-purple-600 hover:text-purple-800 underline">
                Terms of Use
              </Link>
              ,{" "}
              <Link to="/privacy-policy" className="text-purple-600 hover:text-purple-800 underline">
                Privacy Policy
              </Link>
              , and{" "}
              <Link to="/broadcaster-agreement" className="text-purple-600 hover:text-purple-800 underline">
                Broadcaster Agreement
              </Link>
              .
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setView(view === "sign_in" ? "sign_up" : "sign_in")}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              {view === "sign_in"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
