import React, { useEffect, useState, useMemo } from 'react';
import {
  FiMessageSquare, FiClock, FiUser, FiFile, FiCheck,
  FiAlertCircle, FiX, FiPlus, FiArrowLeft, FiDownload,
  FiSearch, FiFilter, FiCalendar, FiPrinter, FiFileText,
  FiColumns
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import API from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CSVLink } from 'react-csv';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: <FiClock className="mr-1" />,
  in_progress: <FiAlertCircle className="mr-1" />,
  resolved: <FiCheck className="mr-1" />,
  rejected: <FiX className="mr-1" />
};

const typeColors = {
  feedback: 'bg-blue-100 text-blue-800',
  request: 'bg-red-100 text-red-800'
};

const FeedbackListPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    startDate: null,
    endDate: null
  });

  const { cardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please login to view feedback');
        navigate('/login');
        return;
      }

      const decoded = decodeToken(token);
      const isAdmin = decoded?.role === 'admin';

      const endpoint = isAdmin ? '/feedback/admin' : '/feedback/user';
      const response = await API.get(endpoint);

      if (response.data) {
        const sortedFeedbacks = response.data.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setFeedbacks(sortedFeedbacks);

        if (cardId) {
          const feedback = sortedFeedbacks.find(f => f.cardId === cardId);
          if (feedback) setSelectedFeedback(feedback);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load feedbacks');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [navigate, cardId]);

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FiFile className="text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <FiFile className="text-green-500" />;
    if (['doc', 'docx'].includes(ext)) return <FiFile className="text-blue-500" />;
    return <FiFile className="text-gray-500" />;
  };

  const handleFeedbackClick = (feedbackCardId) => {
    navigate(`/feedback/${feedbackCardId}`);
  };

  const handleBackToList = () => {
    navigate(location.pathname.includes('/admin') ? '/admin/feedbacks' : '/feedbacks');
  };

  const handleNewFeedback = () => {
    navigate('/submit');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      type: '',
      startDate: null,
      endDate: null
    });
    setSearchTerm('');
  };

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        feedback.cardId?.toLowerCase().includes(searchLower) ||
        feedback.content?.toLowerCase().includes(searchLower) ||
        feedback.category?.toLowerCase().includes(searchLower) ||
        feedback.status?.toLowerCase().includes(searchLower) ||
        feedback.type?.toLowerCase().includes(searchLower) ||
        feedback.adminResponse?.toLowerCase().includes(searchLower)
      );

      const matchesStatus = !filters.status || feedback.status === filters.status;
      const matchesType = !filters.type || feedback.type === filters.type;
      const feedbackDate = new Date(feedback.createdAt);
      const matchesStartDate = !filters.startDate || feedbackDate >= filters.startDate;
      const matchesEndDate = !filters.endDate || feedbackDate <= new Date(filters.endDate.setHours(23, 59, 59, 999));

      return matchesSearch && matchesStatus && matchesType && matchesStartDate && matchesEndDate;
    });
  }, [feedbacks, searchTerm, filters]);

const exportToExcel = () => {
  const dataToExport = filteredFeedbacks.map(feedback => ({
    ID: feedback.cardId,
    Type: feedback.type === 'feedback' ? 'Feedback' : 'Request',
    Category: feedback.category || 'N/A',
    Content: feedback.content,
    Status: feedback.status.replace('_', ' '),
    'Created By': feedback.user?.name || feedback.user?.email || 'N/A',
    'Created By Email': feedback.user?.email || 'N/A',
    'Created By Department': feedback.user?.department || 'N/A',
    'Created At': formatDate(feedback.createdAt),
    'Resolved At': feedback.resolvedAt ? formatDate(feedback.resolvedAt) : 'N/A',
    'Admin Response': feedback.adminResponse || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedbacks');
  
  // Auto-size columns
  const maxWidth = dataToExport.reduce((w, r) => Math.max(w, r.Content?.length || 0), 10);
  worksheet['!cols'] = [{ wch: maxWidth }];
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `feedbacks_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const exportToCSV = () => {
  return filteredFeedbacks.map(feedback => ({
    ID: feedback.cardId,
    Type: feedback.type === 'feedback' ? 'Feedback' : 'Request',
    Category: feedback.category || 'N/A',
    Content: feedback.content,
    Status: feedback.status.replace('_', ' '),
    'Created By': feedback.user?.name || feedback.user?.email || 'N/A',
    'Created By Email': feedback.user?.email || 'N/A',
    'Created By Department': feedback.user?.department || 'N/A',
    'Created At': formatDate(feedback.createdAt),
    'Resolved At': feedback.resolvedAt ? formatDate(feedback.resolvedAt) : 'N/A',
    'Admin Response': feedback.adminResponse || 'N/A',
  }));
};

const printTable = () => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Feedback Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0.5in; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .title { font-size: 1.5em; font-weight: bold; }
          .date { color: #666; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Feedback Report</div>
          <div class="date">Generated on: ${new Date().toLocaleString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Category</th>
              <th>Created By</th>
              <th>Email</th>
              <th>Department</th>
              <th>Content</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredFeedbacks.map(feedback => `
              <tr>
                <td>${feedback.cardId}</td>
                <td>${feedback.type === 'feedback' ? 'Feedback' : 'Request'}</td>
                <td>${feedback.category || 'N/A'}</td>
                <td>${feedback.user?.name || 'N/A'}</td>
                <td>${feedback.user?.email || 'N/A'}</td>
                <td>${feedback.user?.department || 'N/A'}</td>
                <td>${feedback.content}</td>
                <td>${feedback.status.replace('_', ' ')}</td>
                <td>${formatDate(feedback.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

  if (selectedFeedback) {
    return (
      <div className="max-w-4xl mx-auto my-10 px-4">
        <button
          onClick={handleBackToList}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <FiArrowLeft className="mr-2" /> Back to {location.pathname.includes('/admin') ? 'Admin Panel' : 'Feedback List'}
        </button>

        <div className={`p-8 rounded-xl shadow-lg ${selectedFeedback.type === 'request'
            ? 'bg-red-50 border-l-8 border-red-500'
            : 'bg-white border-l-8 border-blue-500'
          }`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {selectedFeedback.type === 'request' ? 'Request Details' : 'Feedback Details'}
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-medium ${typeColors[selectedFeedback.type] || 'bg-gray-100 text-gray-800'
                  }`}>
                  {selectedFeedback.type.charAt(0).toUpperCase() + selectedFeedback.type.slice(1)}
                </span>

                {selectedFeedback.category && (
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {selectedFeedback.category}
                  </span>
                )}

                <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-medium ${statusColors[selectedFeedback.status] || 'bg-gray-100 text-gray-800'
                  }`}>
                  {statusIcons[selectedFeedback.status]}
                  {selectedFeedback.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-500 flex items-center">
              <FiClock className="mr-1" />
              {formatDate(selectedFeedback.createdAt)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Message</h3>
            <p className="text-gray-700 whitespace-pre-line">{selectedFeedback.content}</p>
          </div>

          {selectedFeedback.attachments?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedFeedback.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={`${process.env.REACT_APP_API_URL}/uploads/feedback/${file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-shrink-0 mr-3">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file}
                      </p>
                    </div>
                    <FiDownload className="ml-auto text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {selectedFeedback.adminResponse && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                    <FiUser className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Admin Response</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedFeedback.adminResponse}</p>
                  {selectedFeedback.resolvedAt && (
                    <p className="text-sm text-gray-500 mt-3">
                      <span className="font-medium">Resolved on:</span> {formatDate(selectedFeedback.resolvedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto my-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Feedback Management</h2>
        <p className="text-gray-600 mt-1">View and manage all your submitted feedback and Requests</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search feedback..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${showFilters
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <FiFilter className="mr-2" />
              Filters
              {Object.values(filters).some(val => val !== '' && val !== null) && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                  {Object.values(filters).filter(val => val !== '' && val !== null).length}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiDownload className="mr-2" />
                Export
              </button>

              {showExportOptions && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        exportToExcel();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <FiFileText className="mr-2 text-green-600" />
                      Export to Excel
                    </button>
                    <CSVLink
                      data={exportToCSV()}
                      filename={`feedbacks_${new Date().toISOString().split('T')[0]}.csv`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      onClick={() => setShowExportOptions(false)}
                    >
                      <FiFileText className="mr-2 text-blue-600" />
                      Export to CSV
                    </CSVLink>
                    <button
                      onClick={() => {
                        printTable();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <FiPrinter className="mr-2 text-gray-600" />
                      Print
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleNewFeedback}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2" />
              New Feedback
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="feedback">Feedback</option>
                  <option value="request">Request</option>
                </select>
              </div>

              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <div className="relative">
                  <DatePicker
                    id="start-date"
                    selected={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    selectsStart
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    placeholderText="Select start date"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiCalendar className="text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <div className="relative">
                  <DatePicker
                    id="end-date"
                    selected={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    selectsEnd
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    minDate={filters.startDate}
                    placeholderText="Select end date"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiCalendar className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-16">
            <FiMessageSquare className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No feedback submitted yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              You haven't submitted any feedback or requests yet. Click the button below to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={handleNewFeedback}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit Your First Feedback
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Showing {filteredFeedbacks.length} of {feedbacks.length} feedback items
            </div>
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
                {filteredFeedbacks.length > 0 ? (
                  filteredFeedbacks.map((feedback) => (
                    <tr key={feedback.cardId} className="hover:bg-gray-50">
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                        onClick={() => handleFeedbackClick(feedback.cardId)}
                      >
                        {feedback.cardId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeColors[feedback.type] || 'bg-gray-100 text-gray-800'
                          }`}>
                          {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
                        </span>
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
                            <FiFile className="mr-1" />
                            {feedback.attachments.length} {feedback.attachments.length === 1 ? 'attachment' : 'attachments'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[feedback.status] || 'bg-gray-100 text-gray-800'
                          }`}>
                          {statusIcons[feedback.status]}
                          {feedback.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(feedback.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No feedback found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackListPage;