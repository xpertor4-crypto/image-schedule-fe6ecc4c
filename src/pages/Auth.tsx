import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [acceptAllTerms, setAcceptAllTerms] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (!acceptAllTerms) {
          toast({
            title: t("auth.termsRequired"),
            description: t("auth.pleaseAcceptTerms"),
            variant: "destructive",
          });
          supabase.auth.signOut();
          return;
        }
        navigate("/");
      }
    });
  }, [navigate, t, toast, acceptAllTerms]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{t("auth.welcome")}</h1>
          <p className="text-gray-600">{t("auth.signInToContinue")}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptAllTerms"
              checked={acceptAllTerms}
              onCheckedChange={(checked) => setAcceptAllTerms(checked as boolean)}
            />
            <Label
              htmlFor="acceptAllTerms"
              className="text-sm font-normal leading-relaxed cursor-pointer"
            >
              You must be at least 18 years of age and you must agree to{" "}
              <a
                href="/terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Use
              </a>
              ,{" "}
              <a
                href="/broadcaster-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Broadcaster Agreement
              </a>
              , and{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </Label>
          </div>

          {!acceptAllTerms && (
            <p className="text-sm text-red-600">
              {t("auth.pleaseAcceptTerms")}
            </p>
          )}
        </div>

        <div className={acceptAllTerms ? "" : "opacity-50 pointer-events-none"}>
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
            providers={["google", "github"]}
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: t("auth.email"),
                  password_label: t("auth.password"),
                  button_label: t("auth.signIn"),
                  loading_button_label: t("auth.signingIn"),
                  social_provider_text: t("auth.signInWith"),
                  link_text: t("auth.alreadyHaveAccount"),
                },
                sign_up: {
                  email_label: t("auth.email"),
                  password_label: t("auth.password"),
                  button_label: t("auth.signUp"),
                  loading_button_label: t("auth.signingUp"),
                  social_provider_text: t("auth.signUpWith"),
                  link_text: t("auth.dontHaveAccount"),
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;
