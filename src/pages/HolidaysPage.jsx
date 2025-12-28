import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Trash2, Edit2, X, CalendarDays, Repeat, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { format } from 'date-fns';

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = getAuth();
  const isAdmin = user?.role === 'admin';

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  // Form states
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    type: 'public',
    description: ''
  });

  const [recurringForm, setRecurringForm] = useState({
    name: '',
    day_of_week: '6', // Saturday by default
    scope: 'year',
    type: 'public'
  });

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  const fetchHolidays = async () => {
    try {
      const year = currentDate.getFullYear();
      const response = await api.get(`/holidays?year=${year}`);
      setHolidays(response.data);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  // Check if a date is in the past
  const isDatePast = (dateKey) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateKey);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getHolidayForDate = (dateStr) => {
    return holidays.find(h => h.date === dateStr);
  };

  // Handle date click
  const handleDateClick = (dateKey, isPast) => {
    const holiday = getHolidayForDate(dateKey);

    if (holiday) {
      setSelectedHoliday(holiday);
      setHolidayForm({
        name: holiday.name,
        type: holiday.type,
        description: holiday.description || ''
      });

      if (isPast) {
        // Past holidays - view only (for everyone)
        setViewDialogOpen(true);
      } else if (isAdmin) {
        // Future holidays - admin can edit
        setEditDialogOpen(true);
      } else {
        // Future holidays - non-admin can only view
        setViewDialogOpen(true);
      }
    } else if (isAdmin && !isPast) {
      // No holiday on this date, admin can add (only for future dates)
      setSelectedDate(dateKey);
      setHolidayForm({ name: '', type: 'public', description: '' });
      setAddDialogOpen(true);
    } else if (isAdmin && isPast) {
      // Admin trying to add on past date
      toast.error('Cannot add holidays for past dates');
    }
    // Non-admin clicking on empty date - do nothing
  };

  // Create holiday
  const handleCreateHoliday = async () => {
    if (!holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }

    // Double-check date is not in the past
    if (isDatePast(selectedDate)) {
      toast.error('Cannot add holidays for past dates');
      return;
    }

    try {
      await api.post('/holidays', {
        name: holidayForm.name,
        date: selectedDate,
        type: holidayForm.type,
        description: holidayForm.description
      });
      toast.success('Holiday created successfully');
      setAddDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create holiday');
    }
  };

  // Update holiday
  const handleUpdateHoliday = async () => {
    if (!holidayForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }

    // Double-check date is not in the past
    if (isDatePast(selectedHoliday.date)) {
      toast.error('Cannot modify holidays for past dates');
      return;
    }

    try {
      await api.put(`/holidays/${selectedHoliday.id}`, {
        name: holidayForm.name,
        type: holidayForm.type,
        description: holidayForm.description
      });
      toast.success('Holiday updated successfully');
      setEditDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update holiday');
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async () => {
    // Double-check date is not in the past
    if (isDatePast(selectedHoliday.date)) {
      toast.error('Cannot delete holidays for past dates');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await api.delete(`/holidays/${selectedHoliday.id}`);
      toast.success('Holiday deleted successfully');
      setEditDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete holiday');
    }
  };

  // Create recurring holidays
  const handleCreateRecurring = async () => {
    if (!recurringForm.name.trim()) {
      toast.error('Please enter a holiday name');
      return;
    }

    // Check if the selected year/month is in the past
    const today = new Date();
    const selectedYear = currentDate.getFullYear();
    const selectedMonth = currentDate.getMonth() + 1;

    if (recurringForm.scope === 'year' && selectedYear < today.getFullYear()) {
      toast.error('Cannot add recurring holidays for past years');
      return;
    }

    if (recurringForm.scope === 'month') {
      const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (selectedDate < currentMonth) {
        toast.error('Cannot add recurring holidays for past months');
        return;
      }
    }

    try {
      const payload = {
        name: recurringForm.name,
        day_of_week: parseInt(recurringForm.day_of_week, 10),
        scope: recurringForm.scope,
        year: currentDate.getFullYear(),
        type: recurringForm.type
      };

      if (recurringForm.scope === 'month') {
        payload.month = currentDate.getMonth() + 1;
      }

      const response = await api.post('/holidays/recurring', payload);
      toast.success(response.data.message);
      setRecurringDialogOpen(false);
      setRecurringForm({ name: '', day_of_week: '6', scope: 'year', type: 'public' });
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create recurring holidays');
    }
  };

  // Delete recurring holidays
  const handleDeleteRecurring = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${getDayName(parseInt(recurringForm.day_of_week, 10))} holidays for this ${recurringForm.scope}?`)) return;

    try {
      const payload = {
        day_of_week: parseInt(recurringForm.day_of_week, 10),
        scope: recurringForm.scope,
        year: currentDate.getFullYear()
      };

      if (recurringForm.scope === 'month') {
        payload.month = currentDate.getMonth() + 1;
      }

      const response = await api.delete('/holidays/recurring', { data: payload });
      toast.success(response.data.message);
      setRecurringDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete recurring holidays');
    }
  };

  const getDayName = (dayIndex) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  const getTypeColor = (type) => {
    const colors = {
      public: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', dot: 'bg-red-500' },
      optional: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' },
      restricted: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-500' }
    };
    return colors[type] || colors.public;
  };

  // Render calendar
  const renderCalendar = () => {
    const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Empty cells before first day
    for (let i = 0; i < startingDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 md:h-28 bg-slate-50 border border-slate-100"></div>
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const date = new Date(year, month, day);
      const isToday = date.getTime() === today.getTime();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < today;
      const holiday = getHolidayForDate(dateKey);
      const typeColor = holiday ? getTypeColor(holiday.type) : null;

      // Determine cursor style
      // - Holiday exists: clickable (to view or edit)
      // - Admin + future date + no holiday: clickable (to add)
      // - Admin + past date + no holiday: not-allowed
      // - Non-admin + no holiday: default cursor
      const canClick = holiday || (isAdmin && !isPast);
      const showNotAllowed = isAdmin && isPast && !holiday;

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(dateKey, isPast)}
          className={`
            h-24 md:h-28 border border-slate-100 p-2 transition-all relative
            ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}
            ${isWeekend && !holiday ? 'bg-slate-50' : 'bg-white'}
            ${holiday ? `${typeColor.bg} ${typeColor.border} border-2` : ''}
            ${isPast && !holiday ? 'bg-slate-100 opacity-60' : ''}
            ${canClick ? 'cursor-pointer hover:bg-slate-100' : ''}
            ${showNotAllowed ? 'cursor-not-allowed hover:bg-slate-100' : ''}
          `}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : isPast ? 'text-slate-400' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
            {day}
          </div>
          {holiday && (
            <div className="mt-1">
              <p className={`text-xs font-medium ${typeColor.text} truncate`}>
                {holiday.name}
              </p>
              {holiday.is_recurring && (
                <Repeat className="w-3 h-3 text-slate-400 mt-1" />
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {dayNames.map(day => (
            <div
              key={day}
              className={`p-2 text-center text-sm font-semibold 
                ${day === 'Sun' || day === 'Sat' ? 'text-slate-400 bg-slate-50' : 'text-slate-700 bg-white'}`}
            >
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days}
        </div>
      </>
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get upcoming holidays
  const upcomingHolidays = holidays
    .filter(h => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      return h.date >= todayStr;
    })
    .slice(0, 5);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Holidays
          </h1>
          <p className="text-lg text-slate-600">
            {isAdmin ? 'Manage company holidays' : 'View company holidays'}
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setRecurringDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2"
          >
            <Repeat className="w-4 h-4" />
            Add Recurring Holidays
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPreviousYear} title="Previous Year">
                    <ChevronLeft className="w-4 h-4" />
                    <ChevronLeft className="w-4 h-4 -ml-3" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>

                <h2 className="text-xl font-semibold text-slate-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNextYear} title="Next Year">
                    <ChevronRight className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4 -ml-3" />
                  </Button>
                  <Button variant="outline" onClick={goToToday} size="sm" className="ml-2">
                    Today
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renderCalendar()}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-slate-100 shadow-sm mt-4">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-6">
                <span className="text-sm font-medium text-slate-600">Legend:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-400"></div>
                  <span className="text-sm text-slate-600">Public Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-400"></div>
                  <span className="text-sm text-slate-600">Optional Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-400"></div>
                  <span className="text-sm text-slate-600">Restricted Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Recurring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-200 opacity-60"></div>
                  <span className="text-sm text-slate-600">Past Date</span>
                </div>
              </div>
              {isAdmin && (
                <p className="text-xs text-slate-500 mt-3">
                  Click on any future date to add a holiday. Click on existing holidays to view or edit.
                </p>
              )}
              {!isAdmin && (
                <p className="text-xs text-slate-500 mt-3">
                  Click on any holiday to view details.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Upcoming Holidays */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingHolidays.length > 0 ? (
                <div className="space-y-3">
                  {upcomingHolidays.map(holiday => {
                    const typeColor = getTypeColor(holiday.type);
                    return (
                      <div
                        key={holiday.id}
                        className={`p-3 rounded-lg border-l-4 ${typeColor.bg} ${typeColor.border}`}
                      >
                        <p className={`font-medium ${typeColor.text}`}>{holiday.name}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {format(new Date(holiday.date), 'EEEE, MMM dd, yyyy')}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs capitalize">
                          {holiday.type}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No upcoming holidays</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900">
                {currentDate.getFullYear()} Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Holidays</span>
                  <span className="font-bold text-slate-900">{holidays.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Public</span>
                  <span className="font-medium text-red-600">
                    {holidays.filter(h => h.type === 'public').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Optional</span>
                  <span className="font-medium text-amber-600">
                    {holidays.filter(h => h.type === 'optional').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Restricted</span>
                  <span className="font-medium text-blue-600">
                    {holidays.filter(h => h.type === 'restricted').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Holiday
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Date</p>
              <p className="font-semibold text-slate-900">
                {selectedDate && format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>

            <div>
              <Label>Holiday Name *</Label>
              <Input
                placeholder="e.g., Diwali, Christmas"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={holidayForm.type}
                onValueChange={(value) => setHolidayForm({ ...holidayForm, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                  <SelectItem value="restricted">Restricted Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this holiday..."
                value={holidayForm.description}
                onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateHoliday} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Add Holiday
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog (Admin Only - Future Dates) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Holiday
            </DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Date</p>
                <p className="font-semibold text-slate-900">
                  {format(new Date(selectedHoliday.date), 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>

              <div>
                <Label>Holiday Name *</Label>
                <Input
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select
                  value={holidayForm.type}
                  onValueChange={(value) => setHolidayForm({ ...holidayForm, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public Holiday</SelectItem>
                    <SelectItem value="optional">Optional Holiday</SelectItem>
                    <SelectItem value="restricted">Restricted Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleDeleteHoliday}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateHoliday} className="flex-1 bg-slate-800 hover:bg-slate-900">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Holiday Dialog (Read Only - For Past Holidays or Non-Admin) */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Holiday Details
            </DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4 mt-4">
              {isDatePast(selectedHoliday.date) && isAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    This holiday is in the past and cannot be modified.
                  </p>
                </div>
              )}

              <div className={`p-4 rounded-lg border-2 ${getTypeColor(selectedHoliday.type).bg} ${getTypeColor(selectedHoliday.type).border}`}>
                <p className={`text-lg font-semibold ${getTypeColor(selectedHoliday.type).text}`}>
                  {selectedHoliday.name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {format(new Date(selectedHoliday.date), 'EEEE, MMMM dd, yyyy')}
                </p>
                <Badge variant="outline" className="mt-2 capitalize">
                  {selectedHoliday.type} Holiday
                </Badge>
                {selectedHoliday.is_recurring && (
                  <Badge variant="outline" className="mt-2 ml-2">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>

              {selectedHoliday.description && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-slate-700">{selectedHoliday.description}</p>
                </div>
              )}

              <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recurring Holidays Dialog */}
      <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5" />
              Recurring Holidays
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Create or remove holidays for a specific day of the week (e.g., all Saturdays).
                Only future dates will be affected.
              </p>
            </div>

            <div>
              <Label>Holiday Name *</Label>
              <Input
                placeholder="e.g., Saturday Off, Weekend"
                value={recurringForm.name}
                onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Day of Week</Label>
              <Select
                value={recurringForm.day_of_week}
                onValueChange={(value) => setRecurringForm({ ...recurringForm, day_of_week: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scope</Label>
              <Select
                value={recurringForm.scope}
                onValueChange={(value) => setRecurringForm({ ...recurringForm, scope: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">
                    Current Month ({monthNames[currentDate.getMonth()]} {currentDate.getFullYear()})
                  </SelectItem>
                  <SelectItem value="year">
                    Entire Year ({currentDate.getFullYear()})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Holiday Type</Label>
              <Select
                value={recurringForm.type}
                onValueChange={(value) => setRecurringForm({ ...recurringForm, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                  <SelectItem value="restricted">Restricted Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">
                This will create holidays for all <strong>{getDayName(parseInt(recurringForm.day_of_week, 10))}s</strong> in{' '}
                <strong>
                  {recurringForm.scope === 'month'
                    ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    : currentDate.getFullYear()
                  }
                </strong>
                {' '}(only future dates)
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDeleteRecurring}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove All
              </Button>
              <Button variant="outline" onClick={() => setRecurringDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateRecurring} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HolidaysPage;
