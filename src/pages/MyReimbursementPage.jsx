import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Upload, X, Calendar, FileText, Image, Clock, CheckCircle, XCircle, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';

const MyReimbursementsPage = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [removeBill, setRemoveBill] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd')
  });

  // Edit form states
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: '',
    amount: '',
    description: '',
    expense_date: ''
  });

  const categories = [
    'Travel',
    'Food & Meals',
    'Accommodation',
    'Office Supplies',
    'Equipment',
    'Software & Tools',
    'Training & Courses',
    'Medical',
    'Communication',
    'Other'
  ];

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reimbursements/my');
      setReimbursements(response.data || []);
    } catch (error) {
      toast.error('Failed to load reimbursements');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      amount: '',
      description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd')
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('category', formData.category);
      submitData.append('amount', formData.amount);
      submitData.append('description', formData.description);
      submitData.append('expense_date', formData.expense_date);

      if (selectedImage) {
        submitData.append('bill_image', selectedImage);
      }

      await api.post('/reimbursements/apply', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Reimbursement request submitted successfully');
      setShowApplyModal(false);
      resetForm();
      fetchReimbursements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (reimbursement) => {
    setDeleteTarget(reimbursement);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/reimbursements/${deleteTarget.id}`);
      toast.success('Reimbursement deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchReimbursements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete reimbursement');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Edit handlers
  const handleEditClick = (reimbursement) => {
    setEditTarget(reimbursement);
    setEditFormData({
      title: reimbursement.title || '',
      category: reimbursement.category || '',
      amount: reimbursement.amount?.toString() || '',
      description: reimbursement.description || '',
      expense_date: reimbursement.expense_date ? format(new Date(reimbursement.expense_date), 'yyyy-MM-dd') : ''
    });
    setEditImage(null);
    setEditImagePreview(null);
    setRemoveBill(false);
    setShowEditModal(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setEditImage(file);
      setRemoveBill(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleRemoveExistingBill = () => {
    setRemoveBill(true);
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleConfirmEdit = async () => {
    if (!editTarget) return;

    if (!editFormData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!editFormData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setEditing(true);
    try {
      const submitData = new FormData();
      submitData.append('title', editFormData.title);
      submitData.append('category', editFormData.category);
      submitData.append('amount', editFormData.amount);
      submitData.append('description', editFormData.description);
      submitData.append('expense_date', editFormData.expense_date);

      if (removeBill) {
        submitData.append('remove_bill', 'true');
      }

      if (editImage) {
        submitData.append('bill_image', editImage);
      }

      await api.put(`/reimbursements/${editTarget.id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Reimbursement updated successfully');
      setShowEditModal(false);
      setEditTarget(null);
      setEditImage(null);
      setEditImagePreview(null);
      setRemoveBill(false);
      fetchReimbursements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update reimbursement');
    } finally {
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditTarget(null);
    setEditImage(null);
    setEditImagePreview(null);
    setRemoveBill(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'cleared':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
            <CheckCircle className="w-3 h-3" />
            Cleared
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  const getTotalPending = () => {
    return reimbursements
      .filter(r => r.status === 'pending' || r.status === 'approved')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const getTotalCleared = () => {
    return reimbursements
      .filter(r => r.status === 'cleared')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-800 rounded-xl shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                My Reimbursements
              </h1>
              <p className="text-slate-600">Track and manage your expense reimbursements</p>
            </div>
          </div>
          <Button
            onClick={() => setShowApplyModal(true)}
            className="bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md gap-2"
          >
            <Plus className="w-4 h-4" />
            Apply Reimbursement
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Pending Amount</p>
                  <p className="text-2xl font-bold text-amber-700">₹{getTotalPending().toLocaleString()}</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Total Cleared</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{getTotalCleared().toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-700">{reimbursements.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reimbursement List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-500">Loading reimbursements...</p>
            </div>
          ) : reimbursements.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Reimbursements Yet</h3>
                <p className="text-slate-500 mb-6">You haven't submitted any reimbursement requests</p>
                <Button
                  onClick={() => setShowApplyModal(true)}
                  className="bg-slate-800 hover:bg-slate-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Apply for Reimbursement
                </Button>
              </CardContent>
            </Card>
          ) : (
            reimbursements.map((reimbursement) => (
              <Card key={reimbursement.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <Receipt className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg">{reimbursement.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {reimbursement.category}
                          </Badge>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(reimbursement.expense_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {reimbursement.description && (
                          <p className="text-sm text-slate-500 mt-2">{reimbursement.description}</p>
                        )}
                        {reimbursement.admin_remarks && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500">
                              <span className="font-medium">Admin Remarks:</span> {reimbursement.admin_remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">₹{parseFloat(reimbursement.amount).toLocaleString()}</p>
                      <div className="mt-2">
                        {getStatusBadge(reimbursement.status)}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        {reimbursement.bill_url && (
                          <a
                            href={reimbursement.bill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Image className="w-3 h-3" />
                            View Bill
                          </a>
                        )}
                        {/* Show edit and delete buttons only for pending reimbursements */}
                        {reimbursement.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(reimbursement)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(reimbursement)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Apply Reimbursement Modal */}
        <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Apply for Reimbursement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div>
                <Label className="text-slate-700 font-medium">Title *</Label>
                <Input
                  placeholder="e.g., Client meeting travel expense"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <Label className="text-slate-700 font-medium">Expense Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-slate-700 font-medium">Description</Label>
                <Textarea
                  placeholder="Provide details about the expense..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              {/* Bill Upload */}
              <div>
                <Label className="text-slate-700 font-medium">Bill/Receipt Image (Optional)</Label>
                <div className="mt-1.5">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Bill preview"
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">Click to upload bill image</span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApplyModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-slate-800 hover:bg-slate-900"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Reimbursement Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Edit Reimbursement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div>
                <Label className="text-slate-700 font-medium">Title *</Label>
                <Input
                  placeholder="e.g., Client meeting travel expense"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">Category *</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(val) => setEditFormData({ ...editFormData, category: val })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <Label className="text-slate-700 font-medium">Expense Date *</Label>
                <Input
                  type="date"
                  value={editFormData.expense_date}
                  onChange={(e) => setEditFormData({ ...editFormData, expense_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-slate-700 font-medium">Description</Label>
                <Textarea
                  placeholder="Provide details about the expense..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              {/* Bill Upload */}
              <div>
                <Label className="text-slate-700 font-medium">Bill/Receipt Image</Label>
                <div className="mt-1.5">
                  {/* Show new image preview if selected */}
                  {editImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={editImagePreview}
                        alt="New bill preview"
                        className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-emerald-600 mt-2">New image selected</p>
                    </div>
                  ) : editTarget?.bill_url && !removeBill ? (
                    /* Show existing bill if available and not removed */
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <Image className="w-5 h-5 text-slate-500" />
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">Current bill attached</p>
                          <a
                            href={editTarget.bill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            View current bill
                          </a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveExistingBill}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Upload new bill to replace</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    /* No bill - show upload option */
                    <div>
                      {removeBill && (
                        <p className="text-xs text-amber-600 mb-2">Bill will be removed on save</p>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Click to upload bill image</span>
                        <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={editing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmEdit}
                disabled={editing}
                className="bg-slate-800 hover:bg-slate-900"
              >
                {editing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Reimbursement
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete this reimbursement request? This action cannot be undone.
              </p>

              {deleteTarget && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <Receipt className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{deleteTarget.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {deleteTarget.category}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {format(new Date(deleteTarget.expense_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 mt-2">
                        ₹{parseFloat(deleteTarget.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyReimbursementsPage;
