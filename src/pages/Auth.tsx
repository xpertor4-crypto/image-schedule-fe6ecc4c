import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, UserCircle2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate gender selection for signup
    if (!isLogin && !gender) {
      toast({
        title: 'Gender Required',
        description: 'Please select your gender to continue.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              gender: gender,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Account created successfully! Please check your email for verification.',
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-600 text-center mb-8">
            {isLogin
              ? 'Sign in to continue to your dashboard'
              : 'Sign up to get started'}
          </p>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      gender === 'male'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <User
                      className={`w-8 h-8 mb-2 ${
                        gender === 'male' ? 'text-blue-600' : 'text-blue-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        gender === 'male' ? 'text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      Male
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      gender === 'female'
                        ? 'border-pink-500 bg-pink-50 shadow-md'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <UserCircle2
                      className={`w-8 h-8 mb-2 ${
                        gender === 'female' ? 'text-pink-600' : 'text-pink-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        gender === 'female' ? 'text-pink-700' : 'text-gray-600'
                      }`}
                    >
                      Female
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGender('other')}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      gender === 'other'
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <Users
                      className={`w-8 h-8 mb-2 ${
                        gender === 'other' ? 'text-purple-600' : 'text-purple-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        gender === 'other' ? 'text-purple-700' : 'text-gray-600'
                      }`}
                    >
                      Other
                    </span>
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setGender(null); // Reset gender when switching modes
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              disabled={loading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {!isLogin && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
