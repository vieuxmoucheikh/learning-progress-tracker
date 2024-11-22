import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session and check if we have a user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error during auth callback:', sessionError)
          setError('Authentication failed. Please try again.')
          setTimeout(() => navigate('/', { replace: true }), 3000)
          return
        }

        if (!session) {
          // If no session, try to exchange the token from the URL
          const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/dashboard`
            }
          })

          if (signInError) {
            console.error('Error during sign in:', signInError)
            setError('Authentication failed. Please try again.')
            setTimeout(() => navigate('/', { replace: true }), 3000)
            return
          }
        } else {
          // Remove any hash fragments and navigate to dashboard
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname)
          }
          navigate('/dashboard', { replace: true })
        }
      } catch (error) {
        console.error('Error during auth callback:', error)
        setError('An unexpected error occurred. Please try again.')
        setTimeout(() => navigate('/', { replace: true }), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
    </div>
  )
}
