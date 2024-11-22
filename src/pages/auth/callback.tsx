import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session and check if we have a user
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error during auth callback:', error)
          navigate('/')
          return
        }

        if (!session) {
          console.error('No session found during callback')
          navigate('/')
          return
        }

        // Remove the hash fragment from the URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname)
        }

        navigate('/dashboard')
      } catch (error) {
        console.error('Error during auth callback:', error)
        navigate('/')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
    </div>
  )
}
