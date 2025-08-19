import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './pages/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SubmitFeedback from './pages/SubmitFeedback';
import FeedbackList from './pages/FeedbackList';
import FeedbackDetail from './pages/FeedbackDetailPage';
import AdminPanel from './pages/AdminPanelPage';
import { Toaster } from 'react-hot-toast';
import AdminRoute from './components/AdminRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes (when login/logout happens)
    window.addEventListener('storage', checkAuth);
    
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Don't render anything while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/">
      <div className="min-h-screen bg-gray-50">
        {/* Only show navbar when authenticated */}
        {isAuthenticated && <Navbar />}
        
        <main className={`${isAuthenticated ? 'container mx-auto px-4 py-8' : ''}`}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Home /> : <Login />} />
            <Route path="/login" element={isAuthenticated ? <Home /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Home /> : <Register />} />
            <Route path="/submit" element={isAuthenticated ? <SubmitFeedback /> : <Login />} />
            <Route path="/feedbacks" element={isAuthenticated ? <FeedbackList /> : <Login />} />
            <Route path="/feedback/:id" element={isAuthenticated ? <FeedbackDetail /> : <Login />} />
            <Route 
              path="/admin" 
              element={
                isAuthenticated ? (
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                ) : (
                  <Login />
                )
              } 
            />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;