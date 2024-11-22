import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error during auth callback:', error)
          setError('Authentication failed. Please try again.')
          setTimeout(() => navigate('/'), 3000)
          return
        }

        if (!session) {
          console.error('No session found during callback')
          setError('No session found. Please try again.')
          setTimeout(() => navigate('/'), 3000)
          return
        }

        // Remove the hash fragment from the URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        navigate('/dashboard')
      } catch (error) {
        console.error('Error during auth callback:', error)
        setError('An unexpected error occurred. Please try again.')
        setTimeout(() => navigate('/'), 3000)
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
