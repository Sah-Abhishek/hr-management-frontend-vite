import React, { useState, useEffect } from 'react';
import { Plus, Calendar, X, Gift, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format, eachDayOfInterval, isSameDay, isWeekend, parseISO, differenceInDays } from 'date-fns';

const LeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({});
  const [compOffBalance, setCompOffBalance] = useState(0);

  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Sick Leave',
    dates: [],
    reason: '',
    is_half_day: false,
    half_day_period: 'morning',
  });

  // For date range selection
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLeaves();
    fetchProfile();
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = () => {
    const saved = localStorage.getItem('leave_types');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Add Comp Off if not present
      if (!parsed.find(t => t.name.toLowerCase().includes('comp'))) {
        parsed.push({ name: 'Comp Off', quota: 0 });
      }
      setLeaveTypes(parsed);
    } else {
      setLeaveTypes([
        { name: 'Sick Leave', quota: 12 },
        { name: 'Casual Leave', quota: 12 },
        { name: 'Paid Leave', quota: 15 },
        { name: 'Unpaid Leave', quota: 0 },
        { name: 'Comp Off', quota: 0 }
      ]);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/leaves/my-leaves');
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setLeaveBalance(response.data.leave_balance || {});
      setCompOffBalance(response.data.leave_balance?.comp_off || 0);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleDateRangeChange = () => {
    if (!startDate || !endDate) {
      setLeaveForm(prev => ({ ...prev, dates: [] }));
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      toast.error('End date cannot be before start date');
      return;
    }

    // Generate all dates in range
    const dates = eachDayOfInterval({ start, end });
    setLeaveForm(prev => ({
      ...prev,
      dates: dates.map(d => format(d, 'yyyy-MM-dd'))
    }));
  };

  useEffect(() => {
    handleDateRangeChange();
  }, [startDate, endDate]);

  const toggleDate = (dateStr) => {
    setLeaveForm(prev => {
      const exists = prev.dates.includes(dateStr);
      return {
        ...prev,
        dates: exists
          ? prev.dates.filter(d => d !== dateStr)
          : [...prev.dates, dateStr].sort()
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (leaveForm.dates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }

    // Calculate days
    let daysCount = leaveForm.dates.length;
    if (leaveForm.is_half_day && leaveForm.dates.length === 1) {
      daysCount = 0.5;
    }

    // Check balance for Comp Off
    if (leaveForm.leave_type === 'Comp Off') {
      if (compOffBalance < daysCount) {
        toast.error(`Insufficient comp-off balance. Available: ${compOffBalance} days, Requested: ${daysCount} days`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        leave_type: leaveForm.leave_type,
        dates: leaveForm.dates,
        reason: leaveForm.reason,
        is_half_day: leaveForm.is_half_day,
        half_day_period: leaveForm.half_day_period,
      };

      await api.post('/leaves', payload);
      toast.success('Leave application submitted successfully!');
      setDialogOpen(false);
      resetForm();
      fetchLeaves();
      fetchProfile(); // Refresh balance
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setLeaveForm({
      leave_type: 'Sick Leave',
      dates: [],
      reason: '',
      is_half_day: false,
      half_day_period: 'morning',
    });
    setStartDate('');
    setEndDate('');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'bg-amber-100 text-amber-800',
      manager_approved: 'bg-blue-100 text-blue-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusText = (status) => {
    const textMap = {
      pending: 'Pending',
      manager_approved: 'Manager Approved',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return textMap[status] || status;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      'Sick Leave': 'border-red-200 bg-red-50',
      'Casual Leave': 'border-blue-200 bg-blue-50',
      'Paid Leave': 'border-emerald-200 bg-emerald-50',
      'Unpaid Leave': 'border-amber-200 bg-amber-50',
      'Comp Off': 'border-purple-200 bg-purple-50',
    };
    return colors[type] || 'border-slate-200 bg-slate-50';
  };

  const formatDates = (dates) => {
    if (!dates || dates.length === 0) return 'No dates';

    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);

    if (sortedDates.length === 1) {
      return format(sortedDates[0], 'MMM dd, yyyy');
    }

    if (sortedDates.length === 2) {
      return `${format(sortedDates[0], 'MMM dd')} & ${format(sortedDates[1], 'MMM dd, yyyy')}`;
    }

    // Check if consecutive
    let isConsecutive = true;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = differenceInDays(sortedDates[i], sortedDates[i - 1]);
      if (diff > 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive) {
      return `${format(sortedDates[0], 'MMM dd')} - ${format(sortedDates[sortedDates.length - 1], 'MMM dd, yyyy')}`;
    }

    // Non-consecutive dates
    if (sortedDates.length <= 3) {
      return sortedDates.map(d => format(d, 'MMM dd')).join(', ');
    }

    return `${format(sortedDates[0], 'MMM dd')} - ${format(sortedDates[sortedDates.length - 1], 'MMM dd')} (${sortedDates.length} days)`;
  };

  const getAvailableBalance = (leaveType) => {
    const key = leaveType.toLowerCase().replace(/ /g, '_');
    return leaveBalance[key] ?? 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            My Leaves
          </h1>
          <p className="text-lg text-slate-600">Manage your leave applications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="apply-leave-btn" className="bg-slate-800 hover:bg-slate-900 rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select
                  value={leaveForm.leave_type}
                  onValueChange={(value) => setLeaveForm({ ...leaveForm, leave_type: value })}
                >
                  <SelectTrigger data-testid="leave-type-select" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(type => {
                      const balance = getAvailableBalance(type.name);
                      const isCompOff = type.name.toLowerCase().includes('comp');

                      return (
                        <SelectItem key={type.name} value={type.name}>
                          <div className="flex items-center justify-between w-full">
                            <span className="flex items-center gap-2">
                              {isCompOff && <Gift className="w-4 h-4 text-purple-600" />}
                              {type.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              ({isCompOff ? balance : (type.quota > 0 ? `${balance}/${type.quota}` : 'Unlimited')})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Balance warning for Comp Off */}
                {leaveForm.leave_type === 'Comp Off' && (
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-800">
                        Available comp-off balance: <strong>{compOffBalance} days</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <Label>Select Dates</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs text-slate-500">Start Date</Label>
                    <Input
                      id="start-date"
                      data-testid="start-date-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">End Date</Label>
                    <Input
                      id="end-date"
                      data-testid="end-date-input"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Selected dates preview */}
                {leaveForm.dates.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">
                      Selected: {leaveForm.dates.length} day{leaveForm.dates.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {leaveForm.dates.slice(0, 7).map(date => (
                        <Badge
                          key={date}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-slate-200 flex items-center gap-1"
                          onClick={() => toggleDate(date)}
                        >
                          {format(new Date(date), 'MMM dd')}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                      {leaveForm.dates.length > 7 && (
                        <Badge variant="outline" className="text-xs">
                          +{leaveForm.dates.length - 7} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Half Day Option - only for single day */}
              {leaveForm.dates.length === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      id="is-half-day"
                      type="checkbox"
                      checked={leaveForm.is_half_day}
                      onChange={(e) => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <Label htmlFor="is-half-day" className="text-sm font-medium">
                      Half Day Leave
                    </Label>
                  </div>
                  {leaveForm.is_half_day && (
                    <div>
                      <Label htmlFor="half-day-period">Half Day Period</Label>
                      <Select
                        value={leaveForm.half_day_period}
                        onValueChange={(value) => setLeaveForm({ ...leaveForm, half_day_period: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Balance Check Warning */}
              {leaveForm.leave_type !== 'Unpaid Leave' && leaveForm.dates.length > 0 && (
                (() => {
                  const balance = getAvailableBalance(leaveForm.leave_type);
                  const daysRequested = leaveForm.is_half_day && leaveForm.dates.length === 1
                    ? 0.5
                    : leaveForm.dates.length;

                  if (balance < daysRequested) {
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">
                            Insufficient balance! Available: {balance} days, Requested: {daysRequested} days
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  data-testid="reason-textarea"
                  placeholder="Please provide a reason for your leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  required
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="submit-leave-btn"
                  className="flex-1 bg-slate-800 hover:bg-slate-900"
                  disabled={submitting || leaveForm.dates.length === 0}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {leaveTypes.map(type => {
          const key = type.name.toLowerCase().replace(/ /g, '_');
          const balance = leaveBalance[key] ?? 0;
          const isCompOff = type.name.toLowerCase().includes('comp');

          return (
            <Card key={type.name} className={`border ${getLeaveTypeColor(type.name)}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {isCompOff && <Gift className="w-4 h-4 text-purple-600" />}
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                    {type.name}
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{balance}</p>
                <p className="text-xs text-slate-500">
                  {isCompOff ? 'days available' : (type.quota > 0 ? `of ${type.quota} days` : 'days taken')}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leaves List */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length > 0 ? (
            <div className="space-y-3">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  data-testid={`leave-item-${leave.id}`}
                  className={`p-5 rounded-xl hover:shadow-md transition-all border-2 ${getLeaveTypeColor(leave.leave_type)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {leave.leave_type === 'Comp Off' && (
                          <Gift className="w-4 h-4 text-purple-600" />
                        )}
                        <h3 className="font-semibold text-slate-900">{leave.leave_type}</h3>
                        <Badge className={getStatusBadge(leave.status)}>{getStatusText(leave.status)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDates(leave.dates)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{leave.days_count} day{leave.days_count > 1 ? 's' : ''}</span>
                        {leave.is_half_day && (
                          <span className="text-slate-400"> • Half Day ({leave.half_day_period})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/70 p-3 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Reason: </span>
                      {leave.reason}
                    </p>
                  </div>
                  {leave.approvals && leave.approvals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Approval History</p>
                      <div className="space-y-2">
                        {leave.approvals.map((approval, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-slate-700">{approval.approver_name}</span>
                            <span className="text-slate-500"> ({approval.approver_role}) </span>
                            <span className={approval.action === 'approve' ? 'text-emerald-600' : 'text-red-600'}>
                              {approval.action === 'approve' ? 'approved' : 'rejected'}
                            </span>
                            {approval.comments && (
                              <p className="text-slate-600 mt-1">Comment: {approval.comments}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg mb-2">No leave applications yet</p>
              <p className="text-sm">Click &quot;Apply Leave&quot; to submit your first application</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeavesPage;
