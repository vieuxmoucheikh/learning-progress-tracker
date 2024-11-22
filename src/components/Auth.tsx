import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Auth() {
  const navigate = useNavigate()
  const { user, session } = useAuth()

  useEffect(() => {
    if (user && session) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, session, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Learning Progress Tracker
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to track your learning journey
          </p>
        </div>
        <div className="mt-8">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#4F46E5',
                    brandAccent: '#4338CA',
                  },
                },
              },
            }}
            providers={['google']}
            redirectTo={`${window.location.origin}/auth/callback`}
            onlyThirdPartyProviders
          />
        </div>
      </div>
    </div>
  )
}
