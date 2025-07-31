import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { FiUser, FiBarChart2, FiPieChart, FiTrendingUp, FiMessageSquare, FiThumbsUp, FiAlertCircle, FiClock, FiCheck, FiX, FiDownload, FiEdit } from "react-icons/fi";
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
    if (!userStats) return null;
    
    const data = {
      labels: ['Submitted', 'In Progress', 'Resolved', 'Rejected'],
      datasets: [{
        data: [
          userStats.totalCount,
          userStats.inProgressCount,
          userStats.resolvedCount,
          userStats.rejectedCount
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

    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiBarChart2 className="mr-2 text-blue-500" />
          Your Feedback Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">Total Submitted</p>
            <p className="text-2xl font-bold">{userStats.totalCount}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">In Progress</p>
            <p className="text-2xl font-bold">{userStats.inProgressCount}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">Resolved</p>
            <p className="text-2xl font-bold">{userStats.resolvedCount}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800">Rejected</p>
            <p className="text-2xl font-bold">{userStats.rejectedCount}</p>
          </div>
        </div>
        <div className="h-64">
          <Doughnut data={data} options={{
            plugins: {
              legend: { position: 'right' }
            }
          }} />
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
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 cursor-pointer"
            onClick={() => navigate('/submit')}
          >
            <div className="flex items-center">
              <FiMessageSquare className="text-blue-500 text-2xl mr-3" />
              <h3 className="font-semibold">Submit Feedback</h3>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 cursor-pointer"
            onClick={() => navigate('/feedbacks')}
          >
            <div className="flex items-center">
              <FiBarChart2 className="text-purple-500 text-2xl mr-3" />
              <h3 className="font-semibold">My Submissions</h3>
            </div>
          </motion.div>
          {userRole === 'admin' && (
            <>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 cursor-pointer"
                onClick={() => navigate('/admin')}
              >
                <div className="flex items-center">
                  <FiTrendingUp className="text-green-500 text-2xl mr-3" />
                  <h3 className="font-semibold">Analytics Dashboard</h3>
                </div>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500 cursor-pointer"
                onClick={() => navigate('/admin')}
              >
                <div className="flex items-center">
                  <FiEdit className="text-yellow-500 text-2xl mr-3" />
                  <h3 className="font-semibold">Manage Categories</h3>
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