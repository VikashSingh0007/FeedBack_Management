import React, { useState, useRef, useEffect } from 'react';
import API from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiSend, FiAlertCircle, FiThumbsUp, FiPaperclip, 
  FiX, FiStar, FiChevronDown, FiPlus, FiTrash2, 
  FiEdit2, FiSave, FiCheck, FiXCircle, FiSearch
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';

// Make sure to bind modal to your appElement (http://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#root');

const SubmitFeedback = () => {
  const [formData, setFormData] = useState({
    type: 'feedback',
    mainCategory: '',
    subCategory: '',
    content: '',
    rating: 0,
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMainCategoryDropdown, setShowMainCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

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
    
    // Load categories from backend
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await API.get('/feedback/categories');
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      // Fallback to default categories if API fails
      setCategories({
        'Facility': ['Chairs', 'Desks', 'Food', 'Meeting Rooms', 'Cleaning'],
        'HR': ['Payroll', 'Leave Policy', 'Recruitment', 'Training', 'Complaints'],
        'IT': ['Hardware', 'Software', 'Network', 'Email', 'Security'],
        'Operations': ['Process', 'Logistics', 'Vendors', 'Inventory', 'Safety']
      });
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
      formDataToSend.append('rating', formData.rating.toString());
      formDataToSend.append('category', `${formData.mainCategory} - ${formData.subCategory}`);
      
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
        mainCategory: '',
        subCategory: '',
        content: '', 
        rating: 0 
      });
      setFiles([]);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  const selectMainCategory = (category) => {
    setFormData(prev => ({ ...prev, mainCategory: category, subCategory: '' }));
    setShowMainCategoryDropdown(false);
    setShowSubCategoryDropdown(true);
  };

  const selectSubCategory = (subCategory) => {
    setFormData(prev => ({ ...prev, subCategory }));
    setShowSubCategoryDropdown(false);
  };

  // Filter categories based on search term
  const filteredCategories = Object.keys(categories).reduce((acc, mainCat) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (mainCat.toLowerCase().includes(lowerSearchTerm)) {
      acc[mainCat] = categories[mainCat];
      return acc;
    }
    
    const filteredSubCats = categories[mainCat].filter(subCat => 
      subCat.toLowerCase().includes(lowerSearchTerm)
    );
    
    if (filteredSubCats.length > 0) {
      acc[mainCat] = filteredSubCats;
    }
    
    return acc;
  }, {});

  // Admin category management functions
  const addMainCategory = async () => {
    if (!newMainCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (categories[newMainCategory]) {
      toast.error('Category already exists');
      return;
    }

    try {
      const response = await API.post('/feedback/categories/main', { name: newMainCategory });
      setCategories(prev => ({ ...prev, [newMainCategory]: [] }));
      setNewMainCategory('');
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const addSubCategory = async (mainCategory) => {
    if (!newSubCategory.trim()) {
      toast.error('Please enter a sub-category name');
      return;
    }

    if (categories[mainCategory]?.includes(newSubCategory)) {
      toast.error('Sub-category already exists');
      return;
    }

    try {
      const response = await API.post('/feedback/categories/sub', { 
        mainCategory, 
        subCategory: newSubCategory 
      });
      
      setCategories(prev => ({
        ...prev,
        [mainCategory]: [...(prev[mainCategory] || []), newSubCategory]
      }));
      setNewSubCategory('');
      toast.success('Sub-category added successfully');
    } catch (error) {
      console.error('Error adding sub-category:', error);
      toast.error('Failed to add sub-category');
    }
  };

  const deleteMainCategory = async (category) => {
    if (!window.confirm(`Are you sure you want to delete the "${category}" category and all its sub-categories?`)) {
      return;
    }

    try {
      await API.delete(`/feedback/categories/main/${encodeURIComponent(category)}`);
      const newCategories = { ...categories };
      delete newCategories[category];
      setCategories(newCategories);
      
      if (formData.mainCategory === category) {
        setFormData(prev => ({ ...prev, mainCategory: '', subCategory: '' }));
      }
      
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const deleteSubCategory = async (mainCategory, subCategory) => {
    if (!window.confirm(`Are you sure you want to delete the "${subCategory}" sub-category?`)) {
      return;
    }

    try {
      await API.delete(`/feedback/categories/sub/${encodeURIComponent(mainCategory)}/${encodeURIComponent(subCategory)}`);
      
      setCategories(prev => ({
        ...prev,
        [mainCategory]: prev[mainCategory].filter(sc => sc !== subCategory)
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

  const startEditingCategory = (mainCategory, subCategory = null) => {
    setEditingCategory({ mainCategory, subCategory });
    if (subCategory) {
      setNewSubCategory(subCategory);
    } else {
      setNewMainCategory(mainCategory);
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
        await API.put(`/feedback/categories/sub/${encodeURIComponent(editingCategory.mainCategory)}/${encodeURIComponent(editingCategory.subCategory)}`, {
          newSubCategory
        });

        setCategories(prev => ({
          ...prev,
          [editingCategory.mainCategory]: prev[editingCategory.mainCategory].map(sc => 
            sc === editingCategory.subCategory ? newSubCategory : sc
          )
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
    } else {
      // Editing main category
      if (!newMainCategory.trim()) {
        toast.error('Please enter a category name');
        return;
      }

      try {
        await API.put(`/feedback/categories/main/${encodeURIComponent(editingCategory.mainCategory)}`, {
          newName: newMainCategory
        });

        const newCategories = { ...categories };
        newCategories[newMainCategory] = newCategories[editingCategory.mainCategory];
        delete newCategories[editingCategory.mainCategory];
        setCategories(newCategories);

        if (formData.mainCategory === editingCategory.mainCategory) {
          setFormData(prev => ({ ...prev, mainCategory: newMainCategory }));
        }

        toast.success('Category updated successfully');
        cancelEditing();
      } catch (error) {
        console.error('Error updating category:', error);
        toast.error('Failed to update category');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {formData.type === 'feedback' ? 'Share Your Feedback' : 'Make a Request'}
            </h2>
            <p className="text-gray-600">
              {formData.type === 'feedback' 
                ? 'We value your thoughts and suggestions' 
                : 'Let us know how we can help you'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'feedback', rating: 0})}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.type === 'feedback' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiThumbsUp className="inline mr-2" /> Feedback
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, type: 'request', rating: 0})}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.type === 'request' 
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiAlertCircle className="inline mr-2" /> Request
              </button>
            </div>

            {formData.type === 'feedback' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate your experience?
                </label>
                <div className="flex justify-center space-x-1">
                  {renderStars()}
                </div>
                {formData.rating > 0 && (
                  <p className="text-center text-sm text-gray-500 mt-1">
                    {formData.rating} star{formData.rating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Category</label>
                <button
                  type="button"
                  onClick={() => setShowMainCategoryDropdown(!showMainCategoryDropdown)}
                  className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
                >
                  <span className={formData.mainCategory ? 'text-gray-800' : 'text-gray-500'}>
                    {formData.mainCategory || 'Select a category'}
                  </span>
                  <FiChevronDown className={`transition-transform ${showMainCategoryDropdown ? 'transform rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showMainCategoryDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg py-1 border border-gray-200 max-h-60 overflow-y-auto"
                    >
                      {Object.keys(categories).map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => selectMainCategory(category)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition"
                        >
                          {category}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {formData.mainCategory && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
                  <button
                    type="button"
                    onClick={() => setShowSubCategoryDropdown(!showSubCategoryDropdown)}
                    className="w-full flex justify-between items-center px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
                  >
                    <span className={formData.subCategory ? 'text-gray-800' : 'text-gray-500'}>
                      {formData.subCategory || 'Select a sub-category'}
                    </span>
                    <FiChevronDown className={`transition-transform ${showSubCategoryDropdown ? 'transform rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showSubCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg py-1 border border-gray-200 max-h-60 overflow-y-auto"
                      >
                        {categories[formData.mainCategory]?.map((subCategory) => (
                          <button
                            key={subCategory}
                            type="button"
                            onClick={() => selectSubCategory(subCategory)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition"
                          >
                            {subCategory}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Manage Categories
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'feedback' ? 'Your Feedback' : 'Request Details'}
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
                placeholder={formData.type === 'feedback' 
                  ? 'What do you like or suggest for improvement?' 
                  : 'Please describe your request in detail'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (optional)</label>
              
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
                className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition w-full"
              >
                <FiPaperclip className="mr-2" />
                <span>Click to add files or drag and drop</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">Max 5 files, 5MB each (JPEG, PNG, PDF)</p>
              
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center truncate">
                        <FiPaperclip className="mr-2 text-gray-500 flex-shrink-0" />
                        <span className="truncate text-sm">{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-red-500 transition"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !formData.content || !formData.mainCategory || !formData.subCategory}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition ${
                formData.type === 'feedback' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                  : 'bg-gradient-to-r from-green-600 to-teal-600'
              } ${
                isSubmitting || !formData.content || !formData.mainCategory || !formData.subCategory 
                  ? 'opacity-70 cursor-not-allowed' 
                  : 'hover:opacity-90'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                <>
                  <FiSend className="inline mr-2" />
                  {formData.type === 'feedback' ? 'Submit Feedback' : 'Submit Request'}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onRequestClose={() => {
          setShowCategoryModal(false);
          cancelEditing();
        }}
        contentLabel="Manage Categories"
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manage Categories</h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  cancelEditing();
                }}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Add New Category</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMainCategory}
                    onChange={(e) => setNewMainCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addMainCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                  >
                    <FiPlus className="mr-1" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Existing Categories</h4>
                {Object.keys(filteredCategories).length > 0 ? (
                  Object.keys(filteredCategories).map((mainCat) => (
                    <div key={mainCat} className="pl-4 border-l-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        {editingCategory?.mainCategory === mainCat && !editingCategory.subCategory ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="text"
                              value={newMainCategory}
                              onChange={(e) => setNewMainCategory(e.target.value)}
                              className="flex-1 px-3 py-1 border rounded-lg"
                            />
                            <button
                              onClick={saveEditedCategory}
                              className="p-2 text-green-500 hover:text-green-700 rounded-full hover:bg-green-50 transition"
                            >
                              <FiCheck size={18} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-gray-800">{mainCat}</span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditingCategory(mainCat)}
                                className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50 transition"
                                title="Edit"
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => deleteMainCategory(mainCat)}
                                className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3 pl-4">
                        {filteredCategories[mainCat]?.map((subCat) => (
                          <div key={subCat} className="flex items-center justify-between">
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
                                <span className="text-sm text-gray-700">- {subCat}</span>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => startEditingCategory(mainCat, subCat)}
                                    className="p-1 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50 transition"
                                    title="Edit"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteSubCategory(mainCat, subCat)}
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

                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="text"
                            value={newSubCategory}
                            onChange={(e) => setNewSubCategory(e.target.value)}
                            placeholder="New sub-category"
                            className="flex-1 px-3 py-1 border rounded-lg text-sm"
                          />
                          <button
                            onClick={() => addSubCategory(mainCat)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center text-sm"
                          >
                            <FiPlus size={14} className="mr-1" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? 'No matching categories found' : 'No categories available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
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
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default SubmitFeedback; 