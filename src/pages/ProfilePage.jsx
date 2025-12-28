import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Briefcase, Calendar, Edit2, Save, X, Camera, Upload, FileText, Trash2, Eye, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';

const ProfilePage = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPfp, setUploadingPfp] = useState(false);
  const [uploadingGovId, setUploadingGovId] = useState(false);
  const [govIdDialogOpen, setGovIdDialogOpen] = useState(false);
  const [viewGovIdDialogOpen, setViewGovIdDialogOpen] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState('Aadhaar Card');

  const profilePicInputRef = useRef(null);
  const govIdInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    full_name: '',
    department: '',
    designation: '',
    phone: '',
  });

  const governmentIdTypes = [
    'Aadhaar Card',
    'PAN Card',
    'Passport',
    'Voter ID',
    'Driving License',
    'Other'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setEmployee(response.data);
      setEditForm({
        full_name: response.data.full_name,
        department: response.data.department,
        designation: response.data.designation,
        phone: response.data.phone || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.put(`/employees/${employee.employee_id}`, editForm);
      toast.success('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: employee.full_name,
      department: employee.department,
      designation: employee.designation,
      phone: employee.phone || '',
    });
    setEditing(false);
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    setUploadingPfp(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/uploads/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Profile picture uploaded successfully!');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingPfp(false);
      // Reset input
      if (profilePicInputRef.current) {
        profilePicInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return;

    try {
      await api.delete('/uploads/profile-picture');
      toast.success('Profile picture deleted');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete profile picture');
    }
  };

  const handleGovernmentIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, WebP, or PDF');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setUploadingGovId(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id_type', selectedIdType);

      await api.post('/uploads/government-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Government ID uploaded successfully!');
      setGovIdDialogOpen(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload government ID');
    } finally {
      setUploadingGovId(false);
      // Reset input
      if (govIdInputRef.current) {
        govIdInputRef.current.value = '';
      }
    }
  };

  const handleDeleteGovernmentId = async () => {
    if (!confirm('Are you sure you want to delete your government ID?')) return;

    try {
      await api.delete('/uploads/government-id');
      toast.success('Government ID deleted');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete government ID');
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            My Profile
          </h1>
          <p className="text-lg text-slate-600">View and manage your information</p>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            data-testid="edit-profile-btn"
            className="bg-slate-800 hover:bg-slate-900 rounded-full"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <Card className="lg:col-span-2 border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    data-testid="edit-name-input"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      data-testid="edit-department-input"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-designation">Designation</Label>
                    <Input
                      id="edit-designation"
                      data-testid="edit-designation-input"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    data-testid="edit-phone-input"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                    disabled={submitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="save-profile-btn"
                    className="flex-1 bg-slate-800 hover:bg-slate-900"
                    disabled={submitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-4 ring-slate-100">
                      {employee.profile_picture_url ? (
                        <img
                          src={employee.profile_picture_url}
                          alt={employee.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-slate-600" />
                      )}
                    </div>
                    {/* Upload overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-2">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          ref={profilePicInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleProfilePictureUpload}
                          disabled={uploadingPfp}
                        />
                      </label>
                    </div>
                    {uploadingPfp && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900">{employee.full_name}</h2>
                    <Badge className="mt-2 capitalize">{employee.role}</Badge>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => profilePicInputRef.current?.click()}
                        disabled={uploadingPfp}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        {employee.profile_picture_url ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      {employee.profile_picture_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleDeleteProfilePicture}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Email</p>
                    </div>
                    <p className="text-slate-900 ml-8">{employee.email}</p>
                  </div>

                  {employee.phone && (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Phone</p>
                      </div>
                      <p className="text-slate-900 ml-8">{employee.phone}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Department</p>
                    </div>
                    <p className="text-slate-900 ml-8">{employee.department}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Designation</p>
                    </div>
                    <p className="text-slate-900 ml-8">{employee.designation}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Joining Date</p>
                    </div>
                    <p className="text-slate-900 ml-8">
                      {format(new Date(employee.joining_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-slate-400" />
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Employee ID</p>
                    </div>
                    <p className="text-slate-900 ml-8">{employee.employee_id}</p>
                  </div>
                </div>

                {employee.manager_name && (
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Reports To</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{employee.manager_name}</p>
                        <p className="text-sm text-slate-500">{employee.manager_email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Government ID Card */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                <Shield className="w-5 h-5 text-slate-600" />
                Government ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.government_id_url ? (
                <div className="space-y-4">
                  {/* ID Preview */}
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    {isImageFile(employee.government_id_url) ? (
                      <img
                        src={employee.government_id_url}
                        alt="Government ID"
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">PDF Document</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Uploaded
                      </Badge>
                    </div>
                  </div>

                  {/* ID Info */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">{employee.government_id_type || 'Government ID'}</p>
                    {employee.government_id_uploaded_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        Uploaded on {format(new Date(employee.government_id_uploaded_at), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Dialog open={viewGovIdDialogOpen} onOpenChange={setViewGovIdDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>{employee.government_id_type || 'Government ID'}</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          {isImageFile(employee.government_id_url) ? (
                            <img
                              src={employee.government_id_url}
                              alt="Government ID"
                              className="w-full rounded-lg"
                            />
                          ) : (
                            <iframe
                              src={employee.government_id_url}
                              className="w-full h-[600px] rounded-lg border"
                              title="Government ID PDF"
                            />
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={govIdDialogOpen} onOpenChange={setGovIdDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Upload className="w-4 h-4 mr-2" />
                          Replace
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Government ID</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>ID Type</Label>
                            <Select value={selectedIdType} onValueChange={setSelectedIdType}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {governmentIdTypes.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Upload Document</Label>
                            <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                              <input
                                ref={govIdInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                className="hidden"
                                onChange={handleGovernmentIdUpload}
                                disabled={uploadingGovId}
                              />
                              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">
                                JPEG, PNG, GIF, WebP or PDF (max 10MB)
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => govIdInputRef.current?.click()}
                                disabled={uploadingGovId}
                              >
                                {uploadingGovId ? 'Uploading...' : 'Select File'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDeleteGovernmentId}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No government ID uploaded</p>

                  <Dialog open={govIdDialogOpen} onOpenChange={setGovIdDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-slate-800 hover:bg-slate-900">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload ID
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Government ID</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>ID Type</Label>
                          <Select value={selectedIdType} onValueChange={setSelectedIdType}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {governmentIdTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Upload Document</Label>
                          <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                            <input
                              ref={govIdInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                              className="hidden"
                              onChange={handleGovernmentIdUpload}
                              disabled={uploadingGovId}
                            />
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-slate-500">
                              JPEG, PNG, GIF, WebP or PDF (max 10MB)
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => govIdInputRef.current?.click()}
                              disabled={uploadingGovId}
                            >
                              {uploadingGovId ? 'Uploading...' : 'Select File'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Balance Card */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Sick Leave</p>
                  <p className="text-2xl font-bold text-blue-900">{employee.leave_balance?.sick_leave ?? 0}</p>
                  <p className="text-xs text-blue-600">days remaining</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-700 mb-1">Casual Leave</p>
                  <p className="text-2xl font-bold text-emerald-900">{employee.leave_balance?.casual_leave ?? 0}</p>
                  <p className="text-xs text-emerald-600">days remaining</p>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs font-medium text-purple-700 mb-1">Paid Leave</p>
                  <p className="text-2xl font-bold text-purple-900">{employee.leave_balance?.paid_leave ?? 0}</p>
                  <p className="text-xs text-purple-600">days remaining</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-medium text-slate-700 mb-1">Unpaid Leave</p>
                  <p className="text-2xl font-bold text-slate-900">{employee.leave_balance?.unpaid_leave ?? 0}</p>
                  <p className="text-xs text-slate-600">days used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
