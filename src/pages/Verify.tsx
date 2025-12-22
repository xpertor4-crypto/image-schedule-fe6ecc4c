import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Verify = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Exchange session from the URL if present (supabase-js v2)
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          setStatus('error');
          setMessage(error.message || 'Verification failed');
          toast.error(error.message || 'Verification failed');
          return;
        }

        const session = data?.session ?? (await supabase.auth.getSession()).data?.session;
        const user = session?.user ?? (await supabase.auth.getUser()).data?.user;

        if (user && user.email_confirmed_at) {
          setStatus('success');
          setMessage('Your email was verified — you can now sign in. Redirecting...');
          toast.success('Email verified!');
          setTimeout(() => navigate('/auth'), 2000);
        } else {
          setStatus('error');
          setMessage('Verification completed but we could not confirm the account. Please try signing in.');
          toast.error('Verification failed');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification error');
        toast.error(err.message || 'Verification error');
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {status === 'loading' && <p>Verifying your email…</p>}
      {status === 'success' && <p className="text-green-600">{message}</p>}
      {status === 'error' && <p className="text-red-600">{message}</p>}
    </div>
  );
};

export default Verify;
