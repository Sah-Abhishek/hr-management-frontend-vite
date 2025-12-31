import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle, XCircle, Clock, Send, AlertCircle, Search, Filter, DollarSign, Users, FileText, Eye, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';

const AdminReimbursementsPage = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reimbursements/all');
      setReimbursements(response.data || []);
    } catch (error) {
      toast.error('Failed to load reimbursements');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReimbursements = () => {
    let filtered = reimbursements;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(r => r.status === activeTab);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.employee_name?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getStats = () => {
    const pending = reimbursements.filter(r => r.status === 'pending');
    const approved = reimbursements.filter(r => r.status === 'approved');
    const cleared = reimbursements.filter(r => r.status === 'cleared');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      clearedCount: cleared.length,
      clearedAmount: cleared.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      totalCount: reimbursements.length,
      totalAmount: reimbursements.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    };
  };

  const handleAction = (reimbursement, action) => {
    setSelectedReimbursement(reimbursement);
    setActionType(action);
    setAdminRemarks('');
    setShowActionModal(true);
  };

  const processAction = async () => {
    if (!selectedReimbursement) return;

    setProcessing(true);
    try {
      await api.post(`/reimbursements/${selectedReimbursement.id}/action`, {
        action: actionType,
        remarks: adminRemarks
      });

      const actionMessages = {
        approve: 'Reimbursement approved successfully',
        reject: 'Reimbursement rejected',
        clear: 'Reimbursement cleared and email sent to employee'
      };

      toast.success(actionMessages[actionType] || 'Action completed');
      setShowActionModal(false);
      fetchReimbursements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setProcessing(false);
    }
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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = getStats();
  const filteredReimbursements = getFilteredReimbursements();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-slate-800 rounded-xl shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Reimbursement Management
              </h1>
              <p className="text-slate-600">Review and process employee reimbursement requests</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">₹{stats.pendingAmount.toLocaleString()}</p>
                  <p className="text-xs text-amber-600 mt-1">{stats.pendingCount} requests</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Approved (To Clear)</p>
                  <p className="text-2xl font-bold text-blue-700">₹{stats.approvedAmount.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats.approvedCount} requests</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Cleared</p>
                  <p className="text-2xl font-bold text-emerald-700">₹{stats.clearedAmount.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">{stats.clearedCount} requests</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.totalCount}</p>
                  <p className="text-xs text-purple-600 mt-1">₹{stats.totalAmount.toLocaleString()} total</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-xl">
                  <FileText className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl">All Reimbursement Requests</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4 border-b border-slate-100">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="w-4 h-4" />
                    Pending
                    {stats.pendingCount > 0 && (
                      <Badge className="bg-amber-500 text-white ml-1">{stats.pendingCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                    {stats.approvedCount > 0 && (
                      <Badge className="bg-blue-500 text-white ml-1">{stats.approvedCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="cleared" className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Cleared
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Rejected
                  </TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading reimbursements...</p>
                  </div>
                ) : filteredReimbursements.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Reimbursements Found</h3>
                    <p className="text-slate-500">
                      {searchQuery ? 'Try a different search term' : `No ${activeTab !== 'all' ? activeTab : ''} reimbursements`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReimbursements.map((reimbursement) => (
                      <div
                        key={reimbursement.id}
                        className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold">
                              {reimbursement.employee_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 text-lg">{reimbursement.title}</h3>
                              <p className="text-sm text-slate-600">{reimbursement.employee_name}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {reimbursement.category}
                                </Badge>
                                <span className="text-sm text-slate-500">
                                  {format(new Date(reimbursement.expense_date), 'MMM dd, yyyy')}
                                </span>
                                {getStatusBadge(reimbursement.status)}
                              </div>
                              {reimbursement.description && (
                                <p className="text-sm text-slate-500 mt-2 max-w-xl">{reimbursement.description}</p>
                              )}
                              {reimbursement.admin_remarks && (
                                <div className="mt-2 p-2 bg-slate-50 rounded-lg max-w-xl">
                                  <p className="text-xs text-slate-500">
                                    <span className="font-medium">Remarks:</span> {reimbursement.admin_remarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">₹{parseFloat(reimbursement.amount).toLocaleString()}</p>

                            {reimbursement.bill_url && (
                              <a
                                href={reimbursement.bill_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                              >
                                <Image className="w-3 h-3" />
                                View Bill
                              </a>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4 justify-end">
                              {reimbursement.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAction(reimbursement, 'approve')}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleAction(reimbursement, 'reject')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {reimbursement.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(reimbursement, 'clear')}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Clear & Send Email
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Modal */}
        <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approve' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                {actionType === 'reject' && <XCircle className="w-5 h-5 text-red-600" />}
                {actionType === 'clear' && <Send className="w-5 h-5 text-emerald-600" />}
                {actionType === 'approve' && 'Approve Reimbursement'}
                {actionType === 'reject' && 'Reject Reimbursement'}
                {actionType === 'clear' && 'Clear Reimbursement'}
              </DialogTitle>
            </DialogHeader>

            {selectedReimbursement && (
              <div className="py-4">
                <div className="p-4 bg-slate-50 rounded-xl mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{selectedReimbursement.title}</p>
                      <p className="text-sm text-slate-500">{selectedReimbursement.employee_name}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-800">
                      ₹{parseFloat(selectedReimbursement.amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                {actionType === 'clear' && (
                  <div className="p-4 bg-emerald-50 rounded-xl mb-4 border border-emerald-200">
                    <p className="text-sm text-emerald-700">
                      <strong>Note:</strong> An email notification will be sent to {selectedReimbursement.employee_email || selectedReimbursement.employee_name} confirming that their reimbursement has been cleared.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-700 font-medium">
                    Remarks {actionType === 'reject' ? '*' : '(Optional)'}
                  </Label>
                  <Textarea
                    placeholder={
                      actionType === 'reject'
                        ? 'Please provide a reason for rejection...'
                        : 'Add any remarks or notes...'
                    }
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowActionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={processAction}
                disabled={processing || (actionType === 'reject' && !adminRemarks.trim())}
                className={
                  actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700' :
                    actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-emerald-600 hover:bg-emerald-700'
                }
              >
                {processing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'approve' && 'Approve'}
                    {actionType === 'reject' && 'Reject'}
                    {actionType === 'clear' && 'Clear & Send Email'}
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

export default AdminReimbursementsPage;
