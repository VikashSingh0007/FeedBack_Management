import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import {
  FiClock, FiUser, FiAlertCircle, FiCheck, FiX,
  FiDownload, FiBarChart2, FiPieChart,
  FiTrendingUp, FiCalendar, FiFilter, FiMessageSquare,
  FiThumbsUp, FiThumbsDown, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Feedback {
  cardId: string;
  type: string;
  category?: string;
  status: string;
  content: string;
  user?: {
    id: number;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  rating?: number;
  attachments?: string[];
  resolvedAt?: string | null;
}

interface Stats {
  totalCount: number;
  feedbackCount: number;
  requestCount: number;
  statusCounts: { status: string; count: number }[];
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <FiClock /> },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: <FiAlertCircle /> },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800', icon: <FiCheck /> },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <FiX /> }
];

const typeColors = {
  feedback: 'bg-blue-100 text-blue-800',
  request: 'bg-purple-100 text-purple-800'
};

const ITEMS_PER_PAGE = 10;

const AdminDashboard = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const [feedbackRes, statsRes] = await Promise.all([
        API.get('/feedback/admin'),
        API.get('/feedback/admin/stats')
      ]);

      // Sort by most recent first
      const sortedFeedbacks = feedbackRes.data.sort((a: Feedback, b: Feedback) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setFeedbacks(sortedFeedbacks);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Filter feedbacks based on selected filters
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const statusMatch = statusFilter === 'all' || feedback.status === statusFilter;
    const typeMatch = typeFilter === 'all' || feedback.type === typeFilter;
    return statusMatch && typeMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFeedbacks = filteredFeedbacks.slice(startIndex, endIndex);

  // Chart data preparation
  const statusChartData = {
    labels: stats?.statusCounts.map(item =>
      statusOptions.find(opt => opt.value === item.status)?.label || item.status
    ),
    datasets: [{
      label: 'Feedback by Status',
      data: stats?.statusCounts.map(item => item.count) || [],
      backgroundColor: stats?.statusCounts.map(item => {
        const option = statusOptions.find(opt => opt.value === item.status);
        return option ? option.color.replace('bg-', 'bg-opacity-70 ').replace('text-', '') : '#94a3b8';
      }),
      borderWidth: 1
    }]
  };

  const typeChartData = {
    labels: ['Feedback', 'Request'],
    datasets: [{
      data: [
        stats?.feedbackCount || 0,
        stats?.requestCount || 0
      ],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  const ratingChartData = {
    labels: stats?.ratingDistribution.map(item => `${item.rating} star${item.rating !== 1 ? 's' : ''}`) || [],
    datasets: [{
      label: 'Rating Distribution',
      data: stats?.ratingDistribution.map(item => item.count) || [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(54, 162, 235, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Feedback Dashboard</h1>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm">
            <FiCalendar className="text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Feedback</p>
              <p className="text-3xl font-bold mt-2">{stats?.totalCount || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FiMessageSquare className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Positive Feedback</p>
              <p className="text-3xl font-bold mt-2">
                {feedbacks.filter(f =>
                  f.type === 'feedback' &&
                  f.rating &&
                  f.rating >= 4
                ).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FiThumbsUp className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Requests</p>
              <p className="text-3xl font-bold mt-2">{stats?.requestCount || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FiAlertCircle className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Rating</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FiBarChart2 className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiPieChart className="mr-2 text-blue-500" />
            Feedback Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={typeChartData} options={{
              plugins: {
                legend: { position: 'right' }
              }
            }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiBarChart2 className="mr-2 text-blue-500" />
            Status Overview
          </h3>
          <div className="h-64">
            <Bar data={statusChartData} options={{
              responsive: true,
              scales: {
                y: { beginAtZero: true }
              }
            }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiTrendingUp className="mr-2 text-blue-500" />
            Rating Distribution
          </h3>
          <div className="h-64">
            <Bar data={ratingChartData} options={{
              responsive: true,
              scales: {
                y: { beginAtZero: true }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-md mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Feedback Submissions
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Showing {startIndex + 1}-{Math.min(endIndex, filteredFeedbacks.length)} of {filteredFeedbacks.length})
            </span>
          </h3>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-1 text-sm focus:outline-none"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded px-3 py-1 text-sm focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="feedback">Feedback</option>
                <option value="request">Request</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFeedbacks.map((feedback) => (
                <tr key={feedback.cardId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      onClick={() => navigate(`/feedback/${feedback.cardId}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                    >
                      {feedback.cardId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeColors[feedback.type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'
                      }`}>
                      {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {feedback.user?.email || 'Anonymous'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {feedback.category || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {feedback.content}
                    </div>
                    {feedback.attachments && feedback.attachments.length > 0 && (
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <FiDownload className="mr-1" />
                        {feedback.attachments.length} {feedback.attachments.length === 1 ? 'attachment' : 'attachments'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusOptions.find(s => s.value === feedback.status)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                      {statusOptions.find(s => s.value === feedback.status)?.icon}
                      {statusOptions.find(s => s.value === feedback.status)?.label || feedback.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(feedback.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredFeedbacks.length)}</span> of{' '}
                  <span className="font-medium">{filteredFeedbacks.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">First</span>
                    <FiChevronsLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <FiChevronLeft className="h-5 w-5" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Last</span>
                    <FiChevronsRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;