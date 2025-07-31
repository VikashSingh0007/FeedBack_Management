import { Link, useNavigate } from "react-router-dom";
import { 
  FiLogOut, 
  FiHome, 
  FiMessageSquare, 
  FiList, 
  FiShield,
  FiMenu,
  FiX
} from "react-icons/fi";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check auth status and role
  useEffect(() => {
    const getRoleFromToken = () => {
      if (!token) return null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
      } catch (e) {
        return null;
      }
    };

    const checkAuth = () => {
      const storedToken = localStorage.getItem("token");
      setToken(storedToken);
      if (storedToken) {
        setIsAdmin(getRoleFromToken() === 'admin');
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [token]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsMobileMenuOpen(false);
    navigate("/login");
  };

  if (!token) return null;

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img 
              src={Logo} 
              alt="Company Logo" 
              className="h-8 w-auto object-contain"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink to="/" icon={<FiHome size={18} />} text="Home" />
            <NavLink to="/submit" icon={<FiMessageSquare size={18} />} text="Submit" />
            <NavLink to="/feedbacks" icon={<FiList size={18} />} text="My Feedbacks" />
            
            {isAdmin && (
              <NavLink to="/admin" icon={<FiShield size={18} />} text="Admin" />
            )}
            
            <button 
              onClick={logout}
              className="flex items-center px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-md transition-all hover:opacity-90 text-sm"
            >
              <FiLogOut className="mr-1.5" size={16} />
              <span>Logout</span>
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white shadow-lg absolute w-full"
          >
            <div className="px-4 py-3 space-y-2">
              <MobileNavLink 
                to="/" 
                icon={<FiHome size={20} />} 
                text="Home" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <MobileNavLink 
                to="/submit" 
                icon={<FiMessageSquare size={20} />} 
                text="Submit" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <MobileNavLink 
                to="/feedbacks" 
                icon={<FiList size={20} />} 
                text="My Feedbacks" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {isAdmin && (
                <MobileNavLink 
                  to="/admin" 
                  icon={<FiShield size={20} />} 
                  text="Admin" 
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}
              
              <button
                onClick={logout}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-md transition-all mt-2"
              >
                <FiLogOut className="mr-3" size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Reusable NavLink component for desktop
const NavLink = ({ to, icon, text }) => (
  <Link 
    to={to} 
    className="flex items-center text-gray-600 hover:text-blue-600 transition-all font-medium group px-2 py-1 rounded-md text-sm"
  >
    <span className="mr-2 group-hover:scale-110 transition-transform">{icon}</span>
    <span>{text}</span>
  </Link>
);

// Reusable MobileNavLink component
const MobileNavLink = ({ to, icon, text, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-50 rounded-lg transition text-base font-medium"
  >
    <span className="mr-3 text-gray-500">{icon}</span>
    <span>{text}</span>
  </Link>
);

export default Navbar;