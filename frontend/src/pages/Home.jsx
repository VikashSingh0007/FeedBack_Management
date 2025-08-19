import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBarChart2, FiPieChart, FiTrendingUp, FiMessageSquare, FiThumbsUp, FiAlertCircle, FiClock, FiCheck, FiX, FiDownload, FiEdit, FiStar, FiTag, FiPlus, FiEye } from "react-icons/fi";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import API from "../services/api";
import { toast } from "react-hot-toast";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const Home = () => {
  const [userRole, setUserRole] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserRole(decoded.role);
        
        if (decoded.role === 'admin') {
          const stats = await API.get('/feedback/admin/stats');
          setAdminStats(stats.data);
        } else {
          const stats = await API.get('/feedback/user/stats');
          console.log('📊 [Home] User stats received:', stats.data);
          setUserStats(stats.data);
        }
      } catch (err) {
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const FeatureCard = ({ icon, title, description, delay }) => {
    const [ref, inView] = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay }}
        className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-blue-100"
      >
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-blue-800 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </motion.div>
    );
  };

  const renderUserStats = () => {
    if (loading) {
      return (
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your feedback statistics...</p>
        </div>
      );
    }
    
    if (!userStats) {
      return (
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Start by submitting your first feedback to see statistics here.</p>
          <button
            onClick={() => navigate('/submit')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit Feedback
          </button>
        </div>
      );
    }
    
    const data = {
      labels: ['Submitted', 'In Progress', 'Resolved', 'Rejected'],
      datasets: [{
        data: [
          userStats.totalCount || 0,
          userStats.inProgressCount || 0,
          userStats.resolvedCount || 0,
          userStats.rejectedCount || 0
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)'
        ],
        borderWidth: 1
      }]
    };

    console.log('📊 [Home] Chart data:', data);
    console.log('📊 [Home] Stats values:', {
      totalCount: userStats.totalCount,
      inProgressCount: userStats.inProgressCount,
      resolvedCount: userStats.resolvedCount,
      rejectedCount: userStats.rejectedCount
    });

    return (
      <div className="space-y-6">
        {/* Main Stats Cards */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
            <FiBarChart2 className="mr-3 text-blue-500" />
            Your Feedback Summary
          </h3>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">Total Submitted</p>
                  <p className="text-3xl font-bold text-blue-900">{userStats.totalCount || 0}</p>
                </div>
                <FiMessageSquare className="text-blue-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-800 font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-900">{userStats.inProgressCount || 0}</p>
                </div>
                <FiClock className="text-yellow-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-800 font-medium">Resolved</p>
                  <p className="text-3xl font-bold text-green-900">{userStats.resolvedCount || 0}</p>
                </div>
                <FiCheck className="text-green-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-800 font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">{userStats.rejectedCount || 0}</p>
                </div>
                <FiX className="text-red-500 text-2xl" />
              </div>
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
              <Doughnut 
                data={data} 
                options={{
                  plugins: {
                    legend: { 
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { size: 12 }
                      }
                    }
                  },
                  maintainAspectRatio: false
                }} 
              />
            </div>
            
            {/* Additional Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                  <FiStar className="mr-2 text-yellow-500" />
                  Your Activity
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Response Rate:</span>
                    <span className="font-medium">
                      {userStats.totalCount > 0 
                        ? Math.round(((userStats.resolvedCount || 0) / userStats.totalCount) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg. Response Time:</span>
                    <span className="font-medium">2-3 days</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                  <FiTag className="mr-2 text-blue-500" />
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/submit')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FiPlus className="mr-2" />
                    Submit New Feedback
                  </button>
                  <button
                    onClick={() => navigate('/feedbacks')}
                    className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors border border-blue-200 flex items-center justify-center"
                  >
                    <FiEye className="mr-2" />
                    View All Submissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminStats = () => {
    if (!adminStats) return null;
    
    const statusData = {
      labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      datasets: [{
        label: 'Feedback by Status',
        data: adminStats.statusCounts.map(item => item.count),
        backgroundColor: [
          'rgba(255, 206, 86, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)'
        ],
        borderWidth: 1
      }]
    };

    const typeData = {
      labels: ['Feedback', 'Requests'],
      datasets: [{
        data: [adminStats.feedbackCount, adminStats.requestCount],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ],
        borderWidth: 1
      }]
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiPieChart className="mr-2 text-blue-500" />
            Feedback Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={typeData} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiBarChart2 className="mr-2 text-blue-500" />
            Status Overview
          </h3>
          <div className="h-64">
            <Bar data={statusData} options={{
              responsive: true,
              scales: { y: { beginAtZero: true } }
            }} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            animate={{
              scale: hovered ? [1, 1.1, 1] : 1,
              rotate: hovered ? [0, 10, -10, 0] : 0,
            }}
            transition={{ duration: 0.8 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            className="inline-block mb-6"
          >
            <motion.h2
              className="text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, type: "spring" }}
            >
              {userRole === 'admin' ? '📊 Admin Dashboard' : '🚀 Feedback Portal'}
            </motion.h2>
          </motion.div>

          <motion.p
            className="text-gray-700 text-xl md:text-2xl max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {userRole === 'admin' 
              ? 'Comprehensive analytics and management tools for your feedback system'
              : 'Share your thoughts and help us improve our services'}
          </motion.p>

          <motion.div
            className="mt-8 flex justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => navigate(userRole === 'admin' ? '/admin' : '/submit')}
              className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {userRole === 'admin' ? 'Go to Admin Panel' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="relative overflow-hidden bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {showDetails ? "Hide Features" : "Explore Features"}
            </button>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <div className="mb-16">
          {userRole === 'admin' ? renderAdminStats() : renderUserStats()}
        </div>

        {/* Features Section */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                <FeatureCard
                  icon="📝"
                  title={userRole === 'admin' ? "Feedback Management" : "Easy Submission"}
                  description={userRole === 'admin' 
                    ? "View, filter, and manage all user feedback in one place" 
                    : "Submit feedback in seconds from any device"}
                  delay={0.1}
                />
                <FeatureCard
                  icon="📊"
                  title="Real-time Analytics"
                  description={userRole === 'admin'
                    ? "Comprehensive dashboards with actionable insights"
                    : "Track the status of your submissions with detailed statistics"}
                  delay={0.2}
                />
                <FeatureCard
                  icon="🔔"
                  title="Notifications"
                  description={userRole === 'admin'
                    ? "Get alerts for new submissions and important updates"
                    : "Receive updates when your feedback status changes"}
                  delay={0.3}
                />
                {userRole === 'admin' && (
                  <FeatureCard
                    icon="👥"
                    title="User Management"
                    description="View user activity and manage permissions"
                    delay={0.4}
                  />
                )}
                <FeatureCard
                  icon="📎"
                  title="File Attachments"
                  description="Support for images and documents to provide context"
                  delay={userRole === 'admin' ? 0.4 : 0.5}
                />
                <FeatureCard
                  icon="🔐"
                  title="Secure Platform"
                  description="Enterprise-grade security protecting all your data"
                  delay={userRole === 'admin' ? 0.5 : 0.6}
                />
              </div>

              {/* Interactive Demo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-2xl border-2 border-dashed border-blue-300 text-center mb-8"
              >
                <h3 className="text-2xl font-bold text-blue-800 mb-3">
                  {userRole === 'admin' ? '🚀 Powerful Tools' : '🎉 Get Started'}
                </h3>
                <p className="text-gray-700 mb-4">
                  {userRole === 'admin'
                    ? 'Our admin tools help you turn feedback into actionable improvements'
                    : 'Your feedback helps us create better products and services'}
                </p>
                <button
                  onClick={() => navigate(userRole === 'admin' ? '/admin' : '/submit')}
                  className="bg-white text-blue-600 font-semibold py-2 px-6 rounded-full shadow hover:shadow-md transition"
                >
                  {userRole === 'admin' ? 'Explore Admin Features' : 'Submit Your First Feedback'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Testimonial */}
        <motion.div
          className="bg-white p-8 rounded-2xl shadow-lg max-w-3xl mx-auto border-t-4 border-blue-500 mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <blockquote className="text-center">
            <p className="text-xl italic text-gray-700 mb-4">
              "This feedback portal transformed how we interact with our users. The insights we've gained have been invaluable for our product development."
            </p>
            <footer className="font-semibold text-blue-700">
              — Sarah Johnson, Product Manager
            </footer>
          </blockquote>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => navigate('/submit')}
          >
            <div className="flex items-center">
              <FiMessageSquare className="text-blue-500 text-2xl mr-3" />
              <div>
                <h3 className="font-semibold text-gray-800">Submit Feedback</h3>
                <p className="text-sm text-gray-500">Share your thoughts</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => navigate('/feedbacks')}
          >
            <div className="flex items-center">
              <FiBarChart2 className="text-purple-500 text-2xl mr-3" />
              <div>
                <h3 className="font-semibold text-gray-800">My Submissions</h3>
                <p className="text-sm text-gray-500">Track your feedback</p>
              </div>
            </div>
          </motion.div>
          
          {userRole !== 'admin' && (
            <>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center">
                  <FiEye className="text-green-500 text-2xl mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-800">View Features</h3>
                    <p className="text-sm text-gray-500">Explore capabilities</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/submit')}
              >
                <div className="flex items-center">
                  <FiStar className="text-yellow-500 text-2xl mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-800">Rate Service</h3>
                    <p className="text-sm text-gray-500">Share experience</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
          
          {userRole === 'admin' && (
            <>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/admin')}
              >
                <div className="flex items-center">
                  <FiTrendingUp className="text-green-500 text-2xl mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-800">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-500">View insights</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => navigate('/admin')}
              >
                <div className="flex items-center">
                  <FiEdit className="text-yellow-500 text-2xl mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-800">Manage Categories</h3>
                    <p className="text-sm text-gray-500">Organize feedback</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;