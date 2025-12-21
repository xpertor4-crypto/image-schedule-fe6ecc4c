import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Mail, AlertCircle } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_UP') {
          // Show verification message after signup
          setShowVerificationMessage(true);
          setAuthError(null);
        } else if (event === 'SIGNED_IN') {
          if (session) {
            // Only navigate if email is confirmed
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email_confirmed_at) {
              navigate('/');
            } else {
              setAuthError('Please verify your email before logging in. Check your inbox for the verification link.');
              await supabase.auth.signOut();
            }
          }
        } else if (event === 'USER_UPDATED') {
          // Handle email verification completion
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email_confirmed_at) {
            navigate('/');
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password');
        }
      }
    );

    // Check for error in URL (e.g., email not confirmed)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      if (errorDescription?.includes('Email not confirmed')) {
        setAuthError('Please verify your email before logging in. Check your inbox for the verification link.');
      } else {
        setAuthError(errorDescription || error);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Get the application URL for email redirect
  const getRedirectUrl = () => {
    const url = window.location.origin;
    return url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Image Scheduler</h1>
          <p className="text-muted-foreground">
            {isSignUp ? 'Create an account to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Verification Success Message */}
        {showVerificationMessage && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300 font-semibold">
              Verification Email Sent!
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400 space-y-2">
              <p>
                We've sent a verification link to your email address.
              </p>
              <p className="font-medium">
                Please check your inbox and click the verification link to activate your account.
              </p>
              <div className="flex items-start gap-2 mt-3 text-sm">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Didn't receive the email?</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-green-600 dark:text-green-500">
                    <li>Check your spam/junk folder</li>
                    <li>Make sure you entered the correct email</li>
                    <li>Wait a few minutes and try signing up again</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {authError && !showVerificationMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {/* Auth Form */}
        {!showVerificationMessage && (
          <div className="bg-white dark:bg-gray-950 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#2563eb',
                      brandAccent: '#1d4ed8',
                    },
                  },
                },
                className: {
                  container: 'space-y-4',
                  button: 'w-full',
                  label: 'text-sm font-medium',
                },
              }}
              providers={[]}
              redirectTo={getRedirectUrl()}
              onlyThirdPartyProviders={false}
              magicLink={false}
              view="sign_in"
              showLinks={true}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email Address',
                    password_label: 'Password',
                    button_label: 'Sign In',
                    loading_button_label: 'Signing in...',
                    link_text: "Don't have an account? Sign up",
                  },
                  sign_up: {
                    email_label: 'Email Address',
                    password_label: 'Password',
                    button_label: 'Create Account',
                    loading_button_label: 'Creating account...',
                    link_text: 'Already have an account? Sign in',
                    confirmation_text: 'Check your email for the confirmation link',
                  },
                  forgotten_password: {
                    link_text: 'Forgot your password?',
                    button_label: 'Send reset instructions',
                    loading_button_label: 'Sending...',
                  },
                },
              }}
              additionalData={{
                options: {
                  emailRedirectTo: getRedirectUrl(),
                }
              }}
            />
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                You'll need to verify your email after signing up
              </p>
            </div>
          </div>
        )}

        {/* Show button to go back to sign in after successful signup */}
        {showVerificationMessage && (
          <div className="text-center">
            <button
              onClick={() => {
                setShowVerificationMessage(false);
                setIsSignUp(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Footer with additional info */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;