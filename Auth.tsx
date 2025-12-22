import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from './supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function AuthPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard')
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if email is verified
        if (session.user.email_confirmed_at) {
          toast.success('Successfully logged in!')
          navigate('/dashboard')
        } else {
          // Email not verified - sign out the user
          await supabase.auth.signOut()
          toast.error('Please verify your email before logging in. Check your inbox for the verification link.')
        }
      } else if (event === 'USER_UPDATED') {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user.email_confirmed_at) {
          toast.success('Email verified! You can now log in.')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        toast.success('Verification email sent! Please check your inbox and verify your email before logging in.')
        // Clear form
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setFullName('')
        // Switch to sign in view
        setView('sign_in')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        toast.error('Please verify your email before logging in. Check your inbox for the verification link.')
        return
      }

      // Success case is handled by onAuthStateChange listener
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Image Scheduler
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              view === 'sign_in'
                ? 'bg-white shadow-md text-purple-600 font-semibold'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setView('sign_in')}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              view === 'sign_up'
                ? 'bg-white shadow-md text-purple-600 font-semibold'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setView('sign_up')}
          >
            Sign Up
          </button>
        </div>

        {/* Sign In Form */}
        {view === 'sign_in' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {view === 'sign_up' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
            <p className="text-sm text-gray-600 text-center">
              A verification email will be sent to your inbox
            </p>
          </form>
        )}
      </div>
    </div>
  )
}