import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Lock, Calendar, MapPin } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        navigate("/");
      } else {
        if (!validateAge(dateOfBirth)) {
          toast({
            title: "Age Requirement",
            description: "You must be at least 18 years old to register.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              date_of_birth: dateOfBirth,
              location,
              gender,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              username,
              date_of_birth: dateOfBirth,
              location,
              gender,
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {isLogin
              ? "Enter your credentials to access your account"
              : "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium">
                    Date of Birth
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      placeholder="Your location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Gender</Label>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => setGender("male")}
                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        gender === "male"
                          ? "border-blue-500 bg-blue-50 shadow-md scale-105"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <User className={`h-8 w-8 ${gender === "male" ? "text-blue-600" : "text-gray-400"}`} />
                      <span className={`font-medium text-sm ${gender === "male" ? "text-blue-700" : "text-gray-600"}`}>
                        Male
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender("female")}
                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        gender === "female"
                          ? "border-pink-500 bg-pink-50 shadow-md scale-105"
                          : "border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50/50"
                      }`}
                    >
                      <User className={`h-8 w-8 ${gender === "female" ? "text-pink-600" : "text-gray-400"}`} />
                      <span className={`font-medium text-sm ${gender === "female" ? "text-pink-700" : "text-gray-600"}`}>
                        Female
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender("other")}
                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        gender === "other"
                          ? "border-purple-500 bg-purple-50 shadow-md scale-105"
                          : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                      }`}
                    >
                      <User className={`h-8 w-8 ${gender === "other" ? "text-purple-600" : "text-gray-400"}`} />
                      <span className={`font-medium text-sm ${gender === "other" ? "text-purple-700" : "text-gray-600"}`}>
                        Other
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="pt-2 pb-1 space-y-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-medium text-center text-sm text-gray-700">
                  You must be 18+ to create an account
                </p>
                <p className="text-center leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <a
                    href="/terms"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Use
                  </a>
                  ,{" "}
                  <a
                    href="/privacy"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                  , and{" "}
                  <a
                    href="/broadcaster-agreement"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Broadcaster Agreement
                  </a>
                  .
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
