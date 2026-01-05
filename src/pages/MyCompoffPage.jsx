import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Gift, CalendarDays, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format, addDays } from 'date-fns';

const MyCompOffPage = () => {
  const [compOffs, setCompOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    work_date: '',
    days: '1',
    reason: ''
  });

  useEffect(() => {
    fetchCompOffs();
    fetchHolidays();
  }, []);

  const fetchCompOffs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comp-off/my-requests');
      setCompOffs(response.data || []);
    } catch (error) {
      toast.error('Failed to load comp-off requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await api.get('/holidays');
      setHolidays(response.data || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      work_date: '',
      days: '1',
      reason: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.work_date) {
      toast.error('Please select the date you worked');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/comp-off/request', {
        work_date: formData.work_date,
        days: parseFloat(formData.days),
        reason: formData.reason
      });

      toast.success('Comp-off request submitted successfully');
      setShowRequestModal(false);
      resetForm();
      fetchCompOffs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
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
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
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

  const getAvailableCompOffs = () => {
    return compOffs
      .filter(c => c.status === 'approved' && c.remaining_days > 0)
      .reduce((sum, c) => sum + (c.remaining_days || 0), 0);
  };

  const getPendingCount = () => {
    return compOffs.filter(c => c.status === 'pending').length;
  };

  const getTotalEarned = () => {
    return compOffs
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.days || 0), 0);
  };

  const isHoliday = (dateStr) => {
    return holidays.some(h => {
      const holidayDate = new Date(h.date).toISOString().split('T')[0];
      return holidayDate === dateStr;
    });
  };

  const getHolidayName = (dateStr) => {
    const holiday = holidays.find(h => {
      const holidayDate = new Date(h.date).toISOString().split('T')[0];
      return holidayDate === dateStr;
    });
    return holiday?.name || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                My Comp-Offs
              </h1>
              <p className="text-slate-600">Request compensatory off for working on holidays</p>
            </div>
          </div>
          <Button
            onClick={() => setShowRequestModal(true)}
            className="bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md gap-2"
          >
            <Plus className="w-4 h-4" />
            Request Comp-Off
          </Button>
        </div>

        {/* Info Banner */}
        {/* <div className="mb-6 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 shadow-sm"> */}
        {/*   <div className="flex gap-3 items-start"> */}
        {/*     <div className="p-2 bg-violet-100 rounded-lg"> */}
        {/*       <Info className="w-5 h-5 text-violet-600" /> */}
        {/*     </div> */}
        {/*     <div className="text-sm text-violet-900"> */}
        {/*       <p className="font-semibold mb-1">About Comp-Off</p> */}
        {/*       <p> */}
        {/*         If you worked on a holiday, you can request a compensatory off. Once approved, */}
        {/*         you can use it as a leave within <strong>90 days</strong> of the work date. */}
        {/*       </p> */}
        {/*     </div> */}
        {/*   </div> */}
        {/* </div> */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Available Balance</p>
                  <p className="text-3xl font-bold text-emerald-700">{getAvailableCompOffs()}</p>
                  <p className="text-xs text-emerald-600 mt-1">days to use</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Pending Requests</p>
                  <p className="text-3xl font-bold text-amber-700">{getPendingCount()}</p>
                  <p className="text-xs text-amber-600 mt-1">awaiting approval</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-600 font-medium">Total Earned</p>
                  <p className="text-3xl font-bold text-violet-700">{getTotalEarned()}</p>
                  <p className="text-xs text-violet-600 mt-1">days approved</p>
                </div>
                <div className="p-3 bg-violet-200 rounded-xl">
                  <Gift className="w-6 h-6 text-violet-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comp-Off List */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-slate-600" />
              Comp-Off History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Loading comp-offs...</p>
              </div>
            ) : compOffs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Comp-Off Requests</h3>
                <p className="text-slate-500 mb-6">You haven't requested any comp-offs yet</p>
                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Comp-Off
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {compOffs.map((compOff) => (
                  <div key={compOff.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="p-3 bg-violet-100 rounded-xl">
                          <Calendar className="w-6 h-6 text-violet-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-800">
                              Worked on {format(new Date(compOff.work_date), 'EEEE, MMM dd, yyyy')}
                            </h3>
                            {getStatusBadge(compOff.status)}
                          </div>
                          <p className="text-sm text-slate-500 mb-2">{compOff.reason}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500">
                              Requested: {format(new Date(compOff.created_at), 'MMM dd, yyyy')}
                            </span>
                            {compOff.status === 'approved' && compOff.expiry_date && (
                              <span className="text-amber-600">
                                Expires: {format(new Date(compOff.expiry_date), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                          {compOff.remarks && (
                            <div className="mt-2 p-2 bg-slate-100 rounded-lg">
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">Remarks:</span> {compOff.remarks}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-violet-700">{compOff.days}</p>
                        <p className="text-xs text-slate-500">day{compOff.days !== 1 ? 's' : ''}</p>
                        {compOff.status === 'approved' && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500">Remaining</p>
                            <p className="text-lg font-semibold text-emerald-600">{compOff.remaining_days || compOff.days}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Comp-Off Modal */}
        <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-violet-600" />
                Request Comp-Off
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Work Date */}
              <div>
                <Label className="text-slate-700 font-medium">Date You Worked *</Label>
                <Input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="mt-1.5"
                />
                {formData.work_date && isHoliday(formData.work_date) && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ This was a holiday: {getHolidayName(formData.work_date)}
                  </p>
                )}
                {formData.work_date && !isHoliday(formData.work_date) && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ This date is not marked as a holiday in the system
                  </p>
                )}
              </div>

              {/* Days */}
              <div>
                <Label className="text-slate-700 font-medium">Comp-Off Days *</Label>
                <div className="flex gap-3 mt-1.5">
                  <Button
                    type="button"
                    variant={formData.days === '0.5' ? 'default' : 'outline'}
                    className={formData.days === '0.5' ? 'bg-violet-600 hover:bg-violet-700' : ''}
                    onClick={() => setFormData({ ...formData, days: '0.5' })}
                  >
                    Half Day (0.5)
                  </Button>
                  <Button
                    type="button"
                    variant={formData.days === '1' ? 'default' : 'outline'}
                    className={formData.days === '1' ? 'bg-violet-600 hover:bg-violet-700' : ''}
                    onClick={() => setFormData({ ...formData, days: '1' })}
                  >
                    Full Day (1)
                  </Button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <Label className="text-slate-700 font-medium">Reason *</Label>
                <Textarea
                  placeholder="Describe why you worked on this holiday..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              {/* Info */}
              {/* <div className="p-3 bg-violet-50 rounded-lg border border-violet-100"> */}
              {/*   <p className="text-xs text-violet-700"> */}
              {/*     <strong>Note:</strong> Your request will be sent to your manager for approval. */}
              {/*     Once approved, you can use this comp-off within 90 days. */}
              {/*   </p> */}
              {/* </div> */}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700"
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
      </div>
    </div>
  );
};

export default MyCompOffPage;
