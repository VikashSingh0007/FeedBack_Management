import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FiArrowLeft,
    FiClock,
    FiUser,
    FiFile,
    FiAlertCircle,
    FiCheck,
    FiX,
    FiEdit,
    FiSave,
    FiChevronDown,
    FiDownload,
    FiImage,
    FiPaperclip,
    FiXCircle,
    FiEye,
    FiCalendar,
    FiMessageSquare
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const API_BASE_URL = 'https://feedback-management-1-pymq.onrender.com';

const statusOptions = [
    { value: 'pending', label: 'Pending', icon: <FiClock className="mr-2" /> },
    { value: 'in_progress', label: 'In Progress', icon: <FiAlertCircle className="mr-2" /> },
    { value: 'resolved', label: 'Resolved', icon: <FiCheck className="mr-2" /> },
    { value: 'rejected', label: 'Rejected', icon: <FiX className="mr-2" /> }
];

const FileIcon = ({ type }) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const pdfTypes = ['pdf'];
    const docTypes = ['doc', 'docx', 'txt'];
    const sheetTypes = ['xls', 'xlsx', 'csv'];

    if (imageTypes.includes(type)) return <FiImage className="mr-2 text-blue-500" />;
    if (pdfTypes.includes(type)) return <FiFile className="mr-2 text-red-500" />;
    if (docTypes.includes(type)) return <FiFile className="mr-2 text-blue-600" />;
    if (sheetTypes.includes(type)) return <FiFile className="mr-2 text-green-600" />;
    return <FiFile className="mr-2 text-gray-500" />;
};

const PreviewModal = ({ fileUrl, fileType, onClose }) => {
    const renderPreview = () => {
        if (fileType.startsWith('image/')) {
            return <img src={fileUrl} alt="Preview" className="max-h-[80vh] max-w-full" />;
        } else if (fileType === 'application/pdf' || fileUrl.endsWith('.pdf')) {
            return (
                <iframe
                    src={fileUrl}
                    className="w-full h-[80vh] border-0"
                    title="PDF Preview"
                />
            );
        } else {
            return (
                <div className="p-4 text-center">
                    <FiFile className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-600">Preview not available for this file type</p>
                    <button
                        onClick={() => window.open(fileUrl, '_blank')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Open in New Tab
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                    <FiXCircle size={24} />
                </button>
                <div className="p-4">
                    {renderPreview()}
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'pending': return <FiClock className="mr-1" />;
            case 'in_progress': return <FiAlertCircle className="mr-1" />;
            case 'resolved': return <FiCheck className="mr-1" />;
            case 'rejected': return <FiX className="mr-1" />;
            default: return null;
        }
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            {status.replace('_', ' ')}
        </span>
    );
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function FeedbackDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [adminComment, setAdminComment] = useState('');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [previewFile, setPreviewFile] = useState(null);

    const decodeToken = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    const handleDownload = async (filePath) => {
        try {
            const token = localStorage.getItem('token');
            const fileName = filePath.split('/').pop();

            const response = await axios.get(`${API_BASE_URL}/${filePath}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Download started');
        } catch (err) {
            console.error('Download error:', err);
            toast.error(err.response?.data?.message ||
                err.message ||
                'Failed to download file');
        }
    };

    const handlePreview = (filePath) => {
        const fileType = filePath.split('.').pop().toLowerCase();
        const previewTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf'
        };

        if (previewTypes[fileType]) {
            setPreviewFile({
                url: `${API_BASE_URL}/${filePath}`,
                type: previewTypes[fileType]
            });
        } else {
            toast('Preview not available for this file type', {
                icon: 'ℹ️',
            });
        }
    };

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const decoded = decodeToken(token);
                const userIsAdmin = decoded?.role === 'admin';
                setIsAdmin(userIsAdmin);

                const endpoint = userIsAdmin
                    ? `/feedback/admin/${id}`
                    : `/feedback/user/${id}`;

                const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                setFeedback(response.data);
                setSelectedStatus(response.data.status);
                setAdminComment(response.data.adminResponse || '');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load feedback');
                toast.error(err.response?.data?.message || 'Failed to load feedback');
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [id, navigate]);

const handleStatusUpdate = async (newStatus, comment = '') => {
    try {
        const token = localStorage.getItem('token');
        const payload = {
            status: newStatus,
            adminResponse: comment
        };

        const response = await axios.patch(
            `${API_BASE_URL}/feedback/admin/${id}/status`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Client-side timestamp fallback
        const updatedFeedback = {
            ...response.data,
            resolvedAt: newStatus === 'resolved' 
                ? (response.data.resolvedAt || new Date().toISOString())
                : null
        };

        toast.success('Status updated successfully');
        setFeedback(updatedFeedback);
        setIsResolving(false);
        setShowStatusDropdown(false);
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update status');
    }
};
    const handleQuickResolve = () => {
        if (feedback.status === 'resolved') {
            handleStatusUpdate('pending');
        } else {
            handleStatusUpdate('resolved', feedback.adminResponse);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <FiAlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate(isAdmin ? '/admin' : '/feedbacks')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Back to {isAdmin ? 'Admin Panel' : 'Feedback List'}
                </button>
            </div>
        );
    }

    if (!feedback) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-800">Feedback not found</h2>
                <button
                    onClick={() => navigate('/feedbacks')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Back to Feedback List
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {previewFile && (
                <PreviewModal
                    fileUrl={previewFile.url}
                    fileType={previewFile.type}
                    onClose={() => setPreviewFile(null)}
                />
            )}

            <button
                onClick={() => navigate(isAdmin ? '/admin' : '/feedbacks')}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
            >
                <FiArrowLeft className="mr-2" /> Back to {isAdmin ? 'Dashboard' : 'Feedback List'}
            </button>

            <div className={`p-6 rounded-lg shadow-md ${feedback.type === 'complaint'
                    ? 'bg-red-50 border-l-4 border-red-500'
                    : 'bg-white border-l-4 border-blue-500'
                }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-1.5xl font-bold text-gray-800">
                                {feedback.type === 'complaint' ? 'Complaint' : 'Feedback'} Details
                            </h1>
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                                {feedback.cardId}
                            </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${feedback.type === 'complaint'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                {feedback.type === 'complaint' ? 'Complaint' : 'Feedback'}
                            </span>

                            {isAdmin ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                                    >
                                        <StatusBadge status={selectedStatus} />
                                        <FiChevronDown className="ml-1" />
                                    </button>

                                    {showStatusDropdown && (
                                        <div className="absolute z-10 mt-1 w-48 bg-white shadow-lg rounded-md py-1">
                                            {statusOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSelectedStatus(option.value);
                                                        setShowStatusDropdown(false);
                                                        if (option.value === 'resolved') {
                                                            setIsResolving(true);
                                                        } else {
                                                            handleStatusUpdate(option.value, adminComment);
                                                        }
                                                    }}
                                                    className="flex items-center px-4 py-2 text-sm w-full text-left hover:bg-gray-50"
                                                >
                                                    {option.icon}
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <StatusBadge status={feedback.status} />
                            )}

                            {feedback.category && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                    {feedback.category}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 text-sm text-gray-500">
                        <div className="flex items-center">
                            <FiCalendar className="mr-1" />
                            Created: {formatDateTime(feedback.createdAt)}
                        </div>
                        {feedback.resolvedAt && (
                            <div className="flex items-center">
                                <FiCheck className="mr-1 text-green-500" />
                                Resolved: {formatDateTime(feedback.resolvedAt)}
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && !isResolving && (
                    <div className="mb-4 flex justify-end">
                        <button
                            onClick={handleQuickResolve}
                            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center transition-colors ${feedback.status === 'resolved'
                                    ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                        >
                            {feedback.status === 'resolved' ? (
                                <>
                                    <FiX className="mr-1" /> Reopen
                                </>
                            ) : (
                                <>
                                    <FiCheck className="mr-1" /> Quick Resolve
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                            <FiMessageSquare className="mr-2" /> Message Details
                        </h2>
                        {feedback.user?.email && (
                            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                From: {feedback.user.email}
                            </div>
                        )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                        <p className="text-gray-700 whitespace-pre-line">{feedback.content}</p>
                    </div>
                </div>

                {feedback.attachments && feedback.attachments.length > 0 && (
                    <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                            <FiPaperclip className="mr-2" /> Attachments ({feedback.attachments.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {feedback.attachments.map((filePath, index) => {
                                const fileName = filePath.split('/').pop();
                                const fileType = fileName.split('.').pop().toLowerCase();
                                const canPreview = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(fileType);

                                return (
                                    <div
                                        key={`${filePath}-${index}`}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center min-w-0 flex-1">
                                            <FileIcon type={fileType} />
                                            <span
                                                className="text-sm text-gray-700 truncate ml-2"
                                                title={fileName}
                                            >
                                                {fileName}
                                            </span>
                                        </div>
                                        <div className="flex space-x-2">
                                            {canPreview && (
                                                <button
                                                    onClick={() => handlePreview(filePath)}
                                                    className="text-blue-400 hover:text-blue-600 p-1 transition-colors"
                                                    title="Preview"
                                                >
                                                    <FiEye size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownload(filePath)}
                                                className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                                                title="Download"
                                                >
                                                <FiDownload size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAdmin && (isResolving || feedback.status === 'resolved') && (
                    <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            {feedback.status === 'resolved' ? 'Resolution Details' : 'Resolve Feedback'}
                        </h2>

                        <textarea
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            placeholder="Add resolution comments (optional)"
                            className="w-full p-3 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            rows={4}
                        />

                        <div className="flex justify-end space-x-2">
                            {isResolving && (
                                <button
                                    onClick={() => setIsResolving(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}

                            <button
                                onClick={() => handleStatusUpdate(selectedStatus, adminComment)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center transition-colors"
                            >
                                <FiSave className="mr-2" />
                                {feedback.status === 'resolved' ? 'Update Resolution' : 'Confirm Resolution'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}