import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: '',
    username: '',
    terms: '',
  });
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Single checkbox state for all terms
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validateUsername = (username: string) => {
    return username.length >= 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const newValidationErrors = {
      email: '',
      password: '',
      username: '',
      terms: '',
    };

    if (!validateEmail(email)) {
      newValidationErrors.email = 'Please enter a valid email address';
    }

    if (!validatePassword(password)) {
      newValidationErrors.password = 'Password must be at least 8 characters';
    }

    if (!isLogin && !validateUsername(username)) {
      newValidationErrors.username = 'Username must be at least 3 characters';
    }

    if (!isLogin && !acceptTerms) {
      newValidationErrors.terms = 'You must accept the terms to continue';
    }

    setValidationErrors(newValidationErrors);

    if (Object.values(newValidationErrors).some(error => error !== '')) {
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any credentials
      login({
        id: '1',
        email,
        username: username || email.split('@')[0],
        role: 'user',
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError('Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-purple-300" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 pl-10 border border-purple-300/30 placeholder-purple-300 text-white bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Username"
                  />
                </div>
                {validationErrors.username && (
                  <p className="mt-1 text-sm text-pink-300">{validationErrors.username}</p>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-purple-300" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-purple-300/30 placeholder-purple-300 text-white bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Email address"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-pink-300">{validationErrors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-purple-300" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-purple-300/30 placeholder-purple-300 text-white bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-purple-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-purple-300" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-pink-300">{validationErrors.password}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <div className="flex items-start">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="h-4 w-4 mt-1 text-purple-600 focus:ring-purple-500 border-purple-300/30 rounded bg-white/10"
                  />
                  <label htmlFor="acceptTerms" className="ml-2 block text-sm text-purple-100">
                    You must be at least 18 years of age and you must agree to <a href="/terms-of-use" className="text-pink-300 hover:text-pink-200 underline">Terms of Use</a>, <a href="/broadcaster-agreement" className="text-pink-300 hover:text-pink-200 underline">Broadcaster Agreement</a>, and <a href="/privacy-policy" className="text-pink-300 hover:text-pink-200 underline">Privacy Policy</a>
                  </label>
                </div>
                {validationErrors.terms && (
                  <p className="text-sm text-pink-300">{validationErrors.terms}</p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-pink-300 text-sm text-center bg-pink-500/20 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform transition hover:scale-105"
            >
              {isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-200 hover:text-white text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}