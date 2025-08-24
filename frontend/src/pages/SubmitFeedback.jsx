import React, { useState, useRef, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiSend, FiAlertCircle, FiThumbsUp, FiPaperclip, 
  FiX, FiStar, FiChevronDown, FiPlus, FiTrash2, 
  FiEdit2, FiSave, FiCheck, FiXCircle, FiSearch, FiMessageSquare
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';

// Make sure to bind modal to your appElement (http://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#root');

const SubmitFeedback = () => {
  const [formData, setFormData] = useState({
    type: 'feedback',
    department: '',
    mainCategory: '',
    subCategory: '',
    content: '',
    rating: 0,
    priority: 'medium',
    assignedTo: '',
    isAnonymous: false,
    requiresFollowUp: false
  });

  // Chat system state (only for requests)
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const [hoverRating, setHoverRating] = useState(0);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showMainCategoryDropdown, setShowMainCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState({});
  const [departments, setDepartments] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  // Admin form state
  const [adminForm, setAdminForm] = useState({
    department: '',
    mainCategory: '',
    subCategory: ''
  });

  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Error boundary effect
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      console.error('🚨 [SubmitFeedback] Component error:', error, errorInfo);
      setHasError(true);
      setErrorMessage(error.message || 'An error occurred');
    };

    // Catch any unhandled errors
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => handleError(event.reason, {}));

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  // Show error state if something went wrong
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
                window.location.reload();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is admin on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(decoded.role === 'admin');
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
    
    // Load categories and departments from backend
    fetchCategoriesAndDepartments();
  }, []);

  const fetchCategoriesAndDepartments = async () => {
    try {
      console.log('🔄 [SubmitFeedback] Fetching categories and departments...');
      
      // Fetch departments first
      const departmentsResponse = await API.get('/categories/departments');
      console.log('📋 [SubmitFeedback] Departments response:', departmentsResponse.data);
      
      if (!departmentsResponse.data || departmentsResponse.data.length === 0) {
        console.warn('⚠️ [SubmitFeedback] No departments found, setting default');
        setDepartments(['General']);
      } else {
        // Filter out any null/undefined values before setting state
        const validDepartments = departmentsResponse.data.filter(dept => dept !== null && dept !== undefined);
        console.log('📋 [SubmitFeedback] Valid departments:', validDepartments);
        setDepartments(validDepartments);
      }

      // Fetch all categories
      const categoriesResponse = await API.get('/categories');
      console.log('📋 [SubmitFeedback] Categories response:', categoriesResponse.data);
      
      if (!categoriesResponse.data || Object.keys(categoriesResponse.data).length === 0) {
        console.warn('⚠️ [SubmitFeedback] No categories found, setting default');
        setCategories({
          'General': {
            'General Issues': ['General Problem', 'Other']
          }
        });
      } else {
        // Filter out any null/undefined values and clean the data structure
        const validCategories = {};
        Object.entries(categoriesResponse.data).forEach(([dept, mainCats]) => {
          if (dept && dept !== null && dept !== undefined) {
            validCategories[dept] = {};
            if (mainCats && typeof mainCats === 'object') {
              Object.entries(mainCats).forEach(([mainCat, subCats]) => {
                if (mainCat && mainCat !== null && mainCat !== undefined) {
                  if (Array.isArray(subCats)) {
                    validCategories[dept][mainCat] = subCats.filter(subCat => subCat !== null && subCat !== undefined);
                  } else {
                    validCategories[dept][mainCat] = [];
                  }
                }
              });
            }
          }
        });
        console.log('📋 [SubmitFeedback] Valid categories:', validCategories);
        setCategories(validCategories);
      }

      console.log('✅ [SubmitFeedback] Categories and departments loaded successfully');
    } catch (error) {
      console.error('❌ [SubmitFeedback] Error fetching categories:', error);
      
      // Set fallback data to prevent crashes
      setDepartments(['General']);
      setCategories({
        'General': {
          'General Issues': ['General Problem', 'Other']
        }
      });
      
      toast.error('Failed to load categories. Using default options.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error(`File ${file.name} has an unsupported format (only JPEG, PNG, PDF allowed)`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 5MB)`);
          return false;
        }
        return true;
      });
      
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content) {
      toast.error('Please enter your feedback content');
      return;
    }

    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }

    if (!formData.mainCategory) {
      toast.error('Please select a main category');
      return;
    }

    if (!formData.subCategory) {
      toast.error('Please select a sub-category');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('category', `${formData.mainCategory} - ${formData.subCategory}`);

      // Add rating only for feedback type
      if (formData.type === 'feedback') {
        formDataToSend.append('rating', formData.rating.toString());
      }

      // Add optional fields only for requests
      if (formData.type === 'request') {
        formDataToSend.append('priority', formData.priority);
        if (formData.assignedTo) {
          formDataToSend.append('assignedTo', formData.assignedTo);
        }
        formDataToSend.append('isAnonymous', formData.isAnonymous.toString());
        formDataToSend.append('requiresFollowUp', formData.requiresFollowUp.toString());
      }

      files.forEach(file => {
        formDataToSend.append('files', file);
      });

      await API.post('/feedback', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Thank you for your feedback!');
      setFormData({ 
        type: 'feedback', 
        department: '',
        mainCategory: '',
        subCategory: '',
        content: '', 
        rating: 0,
        priority: 'medium',
        assignedTo: '',
        isAnonymous: false,
        requiresFollowUp: false
      });
      setFiles([]);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      type: 'feedback',
      department: '',
      mainCategory: '',
      subCategory: '',
      content: '',
      rating: 0,
      priority: 'medium',
      assignedTo: '',
      isAnonymous: false,
      requiresFollowUp: false
    });
    setFiles([]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <motion.button
        key={star}
        type="button"
        className={`text-2xl ${star <= (hoverRating || formData.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
      >
        <FiStar className="fill-current" />
      </motion.button>
    ));
  };

  const selectDepartment = (department) => {
    setFormData(prev => ({ ...prev, department }));
    setShowDepartmentDropdown(false);
    setShowMainCategoryDropdown(true);
    setShowSubCategoryDropdown(false);
  };

  const selectMainCategory = (category) => {
    setFormData(prev => ({ ...prev, mainCategory: category, subCategory: '' }));
    setShowMainCategoryDropdown(false);
    setShowSubCategoryDropdown(true);
  };

  const selectSubCategory = (subCategory) => {
    setFormData(prev => ({ ...prev, subCategory }));
    setShowSubCategoryDropdown(false);
  };

  // Filter categories based on search term and selected department
  const filteredCategories = formData.department && categories[formData.department] 
    ? Object.keys(categories[formData.department]).reduce((acc, mainCat) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (mainCat.toLowerCase().includes(lowerSearchTerm)) {
          acc[mainCat] = categories[formData.department][mainCat];
      return acc;
    }
    
        const filteredSubCats = categories[formData.department][mainCat].filter(subCat => 
      subCat.toLowerCase().includes(lowerSearchTerm)
    );
    
    if (filteredSubCats.length > 0) {
      acc[mainCat] = filteredSubCats;
    }
    
    return acc;
      }, {})
    : {};

  // Filter departments based on search term
  const filteredDepartments = departments
    .filter(dep => dep !== null && dep !== undefined) // Filter out null/undefined values
    .filter(dep => dep.toLowerCase().includes(searchTerm.toLowerCase()));

  // Admin category management functions
  const addDepartment = async () => {
    if (!newDepartment.trim()) {
      toast.error('Please enter a department name');
      return;
    }

    if (departments.includes(newDepartment)) {
      toast.error('Department already exists');
      return;
    }

    try {
      const response = await API.post('/categories/departments', { name: newDepartment });
      setDepartments(prev => [...prev, newDepartment]);
      setNewDepartment('');
      toast.success('Department added successfully');
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('Failed to add department');
    }
  };

  const addMainCategory = async () => {
    console.log('🔍 [addMainCategory] Debug info:', {
      department: adminForm.department,
      mainCategory: adminForm.mainCategory,
      adminForm: adminForm
    });

    if (!adminForm.mainCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (!adminForm.department) {
      toast.error('Please select a department first');
      return;
    }

    if (categories[adminForm.department]?.[adminForm.mainCategory]) {
      toast.error('Category already exists in this department');
      return;
    }

    try {
      const response = await API.post('/categories/main', { 
        department: adminForm.department,
        name: adminForm.mainCategory 
      });
      
      setCategories(prev => ({
        ...prev,
        [adminForm.department]: {
          ...prev[adminForm.department],
          [adminForm.mainCategory]: []
        }
      }));
      setAdminForm(prev => ({ ...prev, mainCategory: '' }));
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const addSubCategory = async (department, mainCategory) => {
    console.log('🔍 [addSubCategory] Debug info:', {
      department,
      mainCategory,
      subCategory: adminForm.subCategory,
      adminForm: adminForm
    });

    if (!adminForm.subCategory.trim()) {
      toast.error('Please enter a sub-category name');
      return;
    }

    if (!department || !mainCategory) {
      toast.error('Please select both department and main category');
      return;
    }

    if (categories[department]?.[mainCategory]?.includes(adminForm.subCategory)) {
      toast.error('Sub-category already exists');
      return;
    }

    try {
      const response = await API.post('/categories/sub', { 
        department,
        mainCategory, 
        subCategory: adminForm.subCategory 
      });
      
      setCategories(prev => ({
        ...prev,
        [department]: {
          ...prev[department],
          [mainCategory]: [...(prev[department]?.[mainCategory] || []), adminForm.subCategory]
        }
      }));
      setAdminForm(prev => ({ ...prev, subCategory: '' }));
      toast.success('Sub-category added successfully');
    } catch (error) {
      console.error('Error adding sub-category:', error);
      toast.error('Failed to add sub-category');
    }
  };

  const deleteDepartment = async (department) => {
    if (!window.confirm(`Are you sure you want to delete the "${department}" department and all its categories and sub-categories?`)) {
      return;
    }

    try {
      await API.delete(`/categories/departments/${encodeURIComponent(department)}`);
      const newDepartments = departments.filter(d => d !== department);
      setDepartments(newDepartments);
      
      if (formData.department === department) {
        setFormData(prev => ({ ...prev, department: '' }));
      }
      
      toast.success('Department deleted successfully');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  const deleteMainCategory = async () => {
    if (!adminForm.department || !adminForm.mainCategory) {
      toast.error('Please select both department and main category');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the "${adminForm.mainCategory}" category and all its sub-categories?`)) {
      return;
    }

    try {
      await API.delete(`/categories/main/${encodeURIComponent(adminForm.department)}/${encodeURIComponent(adminForm.mainCategory)}`);
      
      setCategories(prev => {
        const newCategories = { ...prev };
        if (newCategories[adminForm.department]) {
          delete newCategories[adminForm.department][adminForm.mainCategory];
        }
        return newCategories;
      });
      
      if (formData.mainCategory === adminForm.mainCategory) {
        setFormData(prev => ({ ...prev, mainCategory: '', subCategory: '' }));
      }
      
      setAdminForm(prev => ({ ...prev, mainCategory: '' }));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const deleteSubCategory = async (department, mainCategory, subCategory) => {
    if (!window.confirm(`Are you sure you want to delete the "${subCategory}" sub-category?`)) {
      return;
    }

    try {
      await API.delete(`/categories/sub/${encodeURIComponent(department)}/${encodeURIComponent(mainCategory)}/${encodeURIComponent(subCategory)}`);
      
      setCategories(prev => ({
        ...prev,
        [department]: {
          ...prev[department],
          [mainCategory]: prev[department][mainCategory].filter(sc => sc !== subCategory)
        }
      }));
      
      if (formData.mainCategory === mainCategory && formData.subCategory === subCategory) {
        setFormData(prev => ({ ...prev, subCategory: '' }));
      }
      
      toast.success('Sub-category deleted successfully');
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      toast.error('Failed to delete sub-category');
    }
  };

  const startEditingCategory = (department, mainCategory, subCategory = null) => {
    setEditingCategory({ department, mainCategory, subCategory });
    if (subCategory) {
      setNewSubCategory(subCategory);
    } else if (mainCategory) {
      setNewMainCategory(mainCategory);
    } else {
      setNewDepartment(department);
    }
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setNewMainCategory('');
    setNewSubCategory('');
  };

  const saveEditedCategory = async () => {
    if (!editingCategory) return;

    if (editingCategory.subCategory) {
      // Editing sub-category
      if (!newSubCategory.trim()) {
        toast.error('Please enter a sub-category name');
        return;
      }

      try {
        await API.put(`/categories/sub/${encodeURIComponent(editingCategory.department)}/${encodeURIComponent(editingCategory.mainCategory)}/${encodeURIComponent(editingCategory.subCategory)}`, {
          newSubCategory
        });

        setCategories(prev => ({
          ...prev,
          [editingCategory.department]: {
            ...prev[editingCategory.department],
            [editingCategory.mainCategory]: prev[editingCategory.department][editingCategory.mainCategory].map(sc => 
            sc === editingCategory.subCategory ? newSubCategory : sc
          )
          }
        }));

        if (formData.mainCategory === editingCategory.mainCategory && formData.subCategory === editingCategory.subCategory) {
          setFormData(prev => ({ ...prev, subCategory: newSubCategory }));
        }

        toast.success('Sub-category updated successfully');
        cancelEditing();
      } catch (error) {
        console.error('Error updating sub-category:', error);
        toast.error('Failed to update sub-category');
      }
    } else if (editingCategory.mainCategory) {
      // Editing main category
      if (!newMainCategory.trim()) {
        toast.error('Please enter a category name');
        return;
      }

      try {
        await API.put(`/categories/main/${encodeURIComponent(editingCategory.department)}/${encodeURIComponent(editingCategory.mainCategory)}`, {
          newName: newMainCategory
        });

        setCategories(prev => {
          const newCategories = { ...prev };
          if (newCategories[editingCategory.department]) {
            newCategories[editingCategory.department][newMainCategory] = newCategories[editingCategory.department][editingCategory.mainCategory];
            delete newCategories[editingCategory.department][editingCategory.mainCategory];
          }
          return newCategories;
        });

        if (formData.mainCategory === editingCategory.mainCategory) {
          setFormData(prev => ({ ...prev, mainCategory: newMainCategory }));
        }

        toast.success('Category updated successfully');
        cancelEditing();
      } catch (error) {
        console.error('Error updating category:', error);
        toast.error('Failed to update category');
      }
    } else {
      // Editing department
      if (!newDepartment.trim()) {
        toast.error('Please enter a department name');
        return;
      }

      try {
        await API.put(`/categories/departments/${encodeURIComponent(editingCategory.department)}`, {
          newName: newDepartment
        });

        setDepartments(prev => prev.map(d => d === editingCategory.department ? newDepartment : d));
        setCategories(prev => {
          const newCategories = { ...prev };
          if (newCategories[editingCategory.department]) {
            newCategories[newDepartment] = newCategories[editingCategory.department];
            delete newCategories[editingCategory.department];
          }
          return newCategories;
        });

        if (formData.department === editingCategory.department) {
          setFormData(prev => ({ ...prev, department: newDepartment }));
        }

        toast.success('Department updated successfully');
        cancelEditing();
      } catch (error) {
        console.error('Error updating department:', error);
        toast.error('Failed to update department');
      }
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const message = {
      message: chatMessage,
      isAdmin: false,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, message]);
    setChatMessage('');

    // Note: Chat messages are stored locally for now
    // In a real app, you would send this to the backend when the request is submitted
    toast.success('Message added to discussion!');
  };

  return (
    <div className="max-w-6xl mx-auto my-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-3">
              {formData.type === 'feedback' ? 'Share Your Feedback' : 'Make a Request'}
            </h2>
            <p className="text-xl text-blue-100">
              {formData.type === 'feedback' 
                ? 'We value your thoughts and suggestions to improve our services' 
                : 'Let us know how we can help you with your specific needs'}
            </p>
          </div>
          </div>

        <div className="p-8">
          {/* Feedback Type Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setFormData({ ...formData, type: 'feedback', rating: 0 })}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  formData.type === 'feedback' 
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiThumbsUp className="inline mr-2" />
                Share Feedback
              </button>
              <button
                onClick={() => setFormData({ ...formData, type: 'request', rating: 0 })}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  formData.type === 'request' 
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiAlertCircle className="inline mr-2" />
                Make Request
              </button>
            </div>
            </div>

          {/* Main Form Section */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <FiEdit2 className="mr-2 text-blue-600" />
                  {formData.type === 'feedback' ? 'Feedback Details' : 'Request Details'}
                </h3>

                {/* Category Selection */}
                <div className="space-y-6 mb-6">
                  {/* Department Selection */}
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left hover:border-gray-400 transition-colors"
                      >
                        <span className={formData.department ? 'text-gray-900' : 'text-gray-500'}>
                          {formData.department || 'Select Department'}
                        </span>
                        <FiChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showDepartmentDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {Array.isArray(departments) && departments.length > 0 ? (
                            departments.map((dept) => (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => selectDepartment(dept)}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                              >
                                {dept}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500">No departments available</div>
                )}
              </div>
            )}
                    </div>
                  </div>

                  {/* Main Category Selection */}
                  {formData.department && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Category *
                      </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMainCategoryDropdown(!showMainCategoryDropdown)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left hover:border-gray-400 transition-colors"
                >
                          <span className={formData.mainCategory ? 'text-gray-900' : 'text-gray-500'}>
                            {formData.mainCategory || 'Select Main Category'}
                  </span>
                          <FiChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform ${showMainCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                  {showMainCategoryDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {categories[formData.department] && Object.keys(categories[formData.department]).length > 0 ? (
                              Object.keys(categories[formData.department]).map((mainCat) => (
                        <button
                                  key={mainCat}
                          type="button"
                                  onClick={() => selectMainCategory(mainCat)}
                                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                        >
                                  {mainCat}
                        </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">No categories available for this department</div>
                  )}
              </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subcategory Selection */}
              {formData.mainCategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategory *
                      </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSubCategoryDropdown(!showSubCategoryDropdown)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left hover:border-gray-400 transition-colors"
                  >
                          <span className={formData.subCategory ? 'text-gray-900' : 'text-gray-500'}>
                            {formData.subCategory || 'Select Subcategory'}
                    </span>
                          <FiChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform ${showSubCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                    {showSubCategoryDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {categories[formData.department]?.[formData.mainCategory] && 
                             Array.isArray(categories[formData.department][formData.mainCategory]) &&
                             categories[formData.department][formData.mainCategory].length > 0 ? (
                              categories[formData.department][formData.mainCategory].map((subCat) => (
                          <button
                                  key={subCat}
                            type="button"
                                  onClick={() => selectSubCategory(subCat)}
                                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0"
                          >
                                  {subCat}
                          </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">No subcategories available</div>
                    )}
                </div>
              )}
            </div>
              </div>
            )}
                </div>

                {/* Content Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'feedback' ? 'Your Feedback' : 'Request Details'} *
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                    placeholder={formData.type === 'feedback' 
                      ? 'Tell us about your experience, suggestions, or concerns...' 
                      : 'Describe what you need help with...'
                    }
                  />
                </div>

                {/* Optional Fields Section - Only for Requests */}
                {formData.type === 'request' && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <FiEdit2 className="mr-2 text-blue-600" />
                      Additional Information (Optional)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Priority Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Assigned To Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign To (Optional)
                        </label>
                        <input
                          type="text"
                          name="assignedTo"
                          value={formData.assignedTo}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter name or email"
                        />
                      </div>
                    </div>

                    {/* Checkboxes Row */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="isAnonymous"
                          checked={formData.isAnonymous}
                          onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Submit anonymously
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="requiresFollowUp"
                          checked={formData.requiresFollowUp}
                          onChange={(e) => setFormData(prev => ({ ...prev, requiresFollowUp: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Requires follow-up
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating Field (for feedback type) */}
                {formData.type === 'feedback' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-3xl focus:outline-none transform hover:scale-110 transition-transform"
                        >
                          <FiStar
                            className={`${
                              star <= (hoverRating || formData.rating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            } transition-colors`}
                          />
                        </button>
                      ))}
                      <span className="ml-3 text-lg text-gray-600 font-medium">
                        {formData.rating > 0 ? `${formData.rating} star${formData.rating > 1 ? 's' : ''}` : 'No rating'}
                      </span>
                    </div>
                  </div>
                )}

                {/* File Upload Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Attachments (optional)</label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={triggerFileInput}
                    className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 w-full group"
                  >
                    <FiPaperclip className="mr-3 text-2xl text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <div className="text-center">
                      <div className="font-medium text-lg">Click to add files or drag and drop</div>
                      <div className="text-sm text-gray-500 mt-1">Max 5 files, 5MB each (JPEG, PNG, PDF)</div>
                    </div>
              </button>
              
              {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center truncate">
                            <FiPaperclip className="mr-3 text-blue-500 flex-shrink-0" />
                            <span className="truncate text-sm font-medium text-blue-900">{file.name}</span>
                            <span className="ml-3 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                            className="text-blue-500 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full"
                      >
                            <FiX size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

                {/* Submit Button */}
            <button
              type="submit"
                  disabled={isSubmitting || !formData.department || !formData.mainCategory || !formData.subCategory || !formData.content.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Submitting...
                    </div>
              ) : (
                    <div className="flex items-center justify-center">
                      <FiSend className="mr-2" />
                  {formData.type === 'feedback' ? 'Submit Feedback' : 'Submit Request'}
                    </div>
              )}
            </button>
              </div>
            </div>

            {/* Right Column - Admin Panel */}
            <div className="lg:col-span-1">
              {isAdmin && (
                <div className="bg-gray-50 rounded-lg p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                      <FiEdit2 className="mr-2 text-purple-600" />
                      Admin Panel
                    </h3>
                    <button
                      onClick={() => setShowCategoryModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Manage Categories
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">Quick Stats</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>Departments: {departments.length}</div>
                        <div>Total Categories: {Object.keys(categories).reduce((acc, dept) => acc + Object.keys(categories[dept] || {}).length, 0)}</div>
                        <div>Total Subcategories: {Object.keys(categories).reduce((acc, dept) => acc + Object.keys(categories[dept] || {}).reduce((acc2, mainCat) => acc2 + (categories[dept][mainCat]?.length || 0), 0), 0)}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">Recent Activity</h4>
                      <div className="text-sm text-gray-500">
                        <div>• Categories loaded successfully</div>
                        <div>• Ready for management</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </form>
        </div>
      </motion.div>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onRequestClose={() => setShowCategoryModal(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
        contentLabel="Category Management"
      >
        <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Category Management</h2>
              <button
              onClick={() => setShowCategoryModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

          {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                placeholder="Search departments, categories, or subcategories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

          {/* Department Management */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FiEdit2 className="mr-2 text-green-600" />
              Manage Departments
            </h3>
            <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="New department name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={addDepartment}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Add Department
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.isArray(departments) && departments.length > 0 ? (
                departments.map((dept) => (
                  <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">{dept}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditingCategory(dept)}
                        className="text-blue-600 hover:text-blue-800 text-sm p-1 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteDepartment(dept)}
                        className="text-red-600 hover:text-red-800 text-sm p-1 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 col-span-full">No departments available</div>
              )}
            </div>
          </div>

          {/* Main Category Management */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FiEdit2 className="mr-2 text-blue-600" />
              Manage Main Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={adminForm.department}
                  onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  {Array.isArray(departments) && departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  value={adminForm.mainCategory}
                  onChange={(e) => setAdminForm({ ...adminForm, mainCategory: e.target.value })}
                  placeholder="New category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
                  <button
                    onClick={addMainCategory}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Add Main Category
              </button>
              <button
                onClick={deleteMainCategory}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Delete Category
                  </button>
                </div>
              </div>

          {/* Subcategory Management */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FiEdit2 className="mr-2 text-purple-600" />
              Manage Subcategories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={adminForm.department}
                  onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select Department</option>
                  {Array.isArray(departments) && departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
                <select
                  value={adminForm.mainCategory}
                  onChange={(e) => setAdminForm({ ...adminForm, mainCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select Main Category</option>
                  {adminForm.department && categories[adminForm.department] && 
                   Object.keys(categories[adminForm.department]).map((mainCat) => (
                     <option key={mainCat} value={mainCat}>{mainCat}</option>
                   ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory Name</label>
                            <input
                              type="text"
                  value={adminForm.subCategory}
                  onChange={(e) => setAdminForm({ ...adminForm, subCategory: e.target.value })}
                  placeholder="New subcategory name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
                            <button
                onClick={() => addSubCategory(adminForm.department, adminForm.mainCategory)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                            >
                Add Subcategory
                            </button>
                            <button
                onClick={() => deleteSubCategory(adminForm.department, adminForm.mainCategory, adminForm.subCategory)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                            >
                Delete Subcategory
                            </button>
                          </div>
          </div>

          {/* Current Categories Display */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FiSearch className="mr-2 text-gray-600" />
              Current Categories
            </h3>
            <div className="space-y-4">
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((department) => (
                  <div key={department} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800 text-lg">{department}</h4>
                            <div className="flex space-x-2">
                              <button
                          onClick={() => startEditingCategory(department)}
                          className="text-blue-600 hover:text-blue-800 text-sm p-1 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                          onClick={() => deleteDepartment(department)}
                          className="text-red-600 hover:text-red-800 text-sm p-1 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                      </div>

                      <div className="space-y-3 pl-4">
                      {/* Show main categories for this department */}
                      {categories[department] && typeof categories[department] === 'object' ? (
                        Object.entries(categories[department]).map(([mainCat, subCats]) => (
                          <div key={mainCat} className="border-l-2 border-gray-200 pl-3">
                            <div className="font-medium text-gray-700 mb-2">{mainCat}</div>
                            {/* Show subcategories for this main category */}
                            {Array.isArray(subCats) && subCats.map((subCat) => (
                              <div key={subCat} className="flex items-center justify-between ml-3 mb-1">
                            {editingCategory?.mainCategory === mainCat && editingCategory?.subCategory === subCat ? (
                              <div className="flex items-center space-x-2 flex-1">
                                <input
                                  type="text"
                                  value={newSubCategory}
                                  onChange={(e) => setNewSubCategory(e.target.value)}
                                  className="flex-1 px-3 py-1 border rounded-lg text-sm"
                                />
                                <button
                                  onClick={saveEditedCategory}
                                  className="p-2 text-green-500 hover:text-green-700 rounded-full hover:bg-green-50 transition"
                                >
                                  <FiCheck size={16} />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition"
                                >
                                  <FiX size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                    <span className="text-sm text-gray-600">- {subCat}</span>
                                <div className="flex space-x-2">
                                  <button
                                        onClick={() => startEditingCategory(department, mainCat, subCat)}
                                    className="p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50 transition"
                                    title="Edit"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                        onClick={() => deleteSubCategory(department, mainCat, subCat)}
                                    className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition"
                                    title="Delete"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">No categories available for this department</div>
                      )}
                      </div>
                    </div>
                  ))
                ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No matching departments found' : 'No departments available'}
                  </div>
                )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Chat System Section - Only for Requests */}
      {formData.type === 'request' && (
        <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiMessageSquare className="mr-2 text-blue-600" />
            Request Discussion
          </h3>
          
          {/* Chat Messages */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
            {chatMessages.length > 0 ? (
              <div className="space-y-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isAdmin
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {message.isAdmin ? 'Admin' : 'You'} • {new Date(message.timestamp).toLocaleString()}
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FiMessageSquare className="mx-auto text-4xl mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && chatMessage.trim()) {
                  handleSendMessage();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <FiMessageSquare className="mr-2" />
              Send
            </button>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          position: relative;
          margin: 0 20px;
        }
      `}</style>
    </div>
  );
};

export default SubmitFeedback; 