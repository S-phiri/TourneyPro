import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-yellow-600/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white">TourneyPro</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/')}
              className={`nav-link ${
                isActive('/') ? 'text-yellow-500' : 'text-white'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/leagues')}
              className={`nav-link ${
                isActive('/leagues') ? 'text-yellow-500' : 'text-white'
              }`}
            >
              Leagues
            </button>
            <button 
              onClick={() => navigate('/venues')}
              className={`nav-link ${
                isActive('/venues') ? 'text-yellow-500' : 'text-white'
              }`}
            >
              Venues
            </button>
            {isAuthenticated && (
              <button 
                onClick={() => navigate('/dashboard')}
                className={`nav-link ${
                  isActive('/dashboard') ? 'text-yellow-500' : 'text-white'
                }`}
              >
                Dashboard
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Button 
                  onClick={() => navigate('/start-hosting')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6"
                >
                  Start Hosting
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">
                    {user?.first_name || user?.username}
                  </span>
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black"
                  >
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/login')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
