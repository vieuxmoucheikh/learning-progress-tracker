import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
 
const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center">
        {/* Remplacer ou supprimer cette ligne */}
        {/* <h1 className="text-xl font-bold">Learning Dashboard</h1> */}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm font-medium">{user.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </>
        ) : (
          <Link to="/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
        )}
        <UserCircle className="w-6 h-6 text-gray-600" />
      </div>
    </header>
  );
};

export default Header;