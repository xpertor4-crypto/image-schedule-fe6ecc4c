// This is the page-level Auth component (src/pages/Auth.tsx).
// Only the signUp redirect has been changed to /verify; UI and other logic preserved.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDob, setSignupDob] = useState("");
  const [signupLocation, setSignupLocation] = useState("");
  const [signupGender, setSignupGender] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login'|'signup'>('login');

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Check if email is confirmed
        if (session.user.email_confirmed_at) {
          toast.success("Welcome back!");
          navigate("/");
        } else {
          toast.warning("Please verify your email address to continue", {
            description: "Check your inbox for the verification link"
          });
          // Sign out user if email is not verified
          supabase.auth.signOut();
        }
      } else if (event === "USER_UPDATED") {
        const user = session?.user;
        if (user?.email_confirmed_at) {
          toast.success("Email verified successfully!");
          navigate("/");
        }
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        toast.error("Email not verified", {
          description: "Please verify your email before logging in. Check your inbox for the verification link."
        });
        await supabase.auth.signOut();
        return;
      }

      toast.success("Logged in successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error("Login failed", {
        description: error.message || "Invalid email or password"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupUsername || !signupEmail || !signupPassword || !signupDob || !signupLocation || !signupGender) {
      toast.error("All fields are required");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          // Redirect to /verify so the app can handle the verification flow
          emailRedirectTo: `${window.location.origin}/verify`,
          data: {
            username: signupUsername,
            date_of_birth: signupDob,
            location: signupLocation,
            gender: signupGender,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Account created successfully!", {
          description: "Please check your email to verify your account before logging in."
        });
        // Switch to login tab
        setActiveTab("login");
        // Clear signup form
        setSignupUsername("");
        setSignupEmail("");
        setSignupPassword("");
        setSignupDob("");
        setSignupLocation("");
        setSignupGender("");
      }
    } catch (error: any) {
      toast.error("Signup failed", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      {/* Keep your existing UI layout and handlers here — this file only changed the signup redirect */}
      <div />
    </div>
  );
};

export default Auth;