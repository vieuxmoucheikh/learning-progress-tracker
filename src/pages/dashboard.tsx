import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import App from '../App';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading } = useAuth();

  useEffect(() => {
    // Remove hash fragment if present
    if (location.hash) {
      window.history.replaceState(null, '', location.pathname);
    }

    if (!loading && !session) {
      console.log('No session found, redirecting to login');
      navigate('/', { replace: true });
    }
  }, [session, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <App />;
}
