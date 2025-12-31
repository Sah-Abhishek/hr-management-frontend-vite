import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Save, Send, Calendar, Info, ChevronDown, ChevronUp, Calculator, User, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { format } from 'date-fns';

const SalaryStructurePage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [salaryTemplate, setSalaryTemplate] = useState(null);

  // Unpaid leave states
  const [unpaidLeaves, setUnpaidLeaves] = useState([]);
  const [unpaidFullDays, setUnpaidFullDays] = useState(0);
  const [unpaidHalfDays, setUnpaidHalfDays] = useState(0);
  const [deductUnpaidLeaves, setDeductUnpaidLeaves] = useState(true);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);

  // Manual deduction rates
  const [perFullDayDeduction, setPerFullDayDeduction] = useState(0);
  const [perHalfDayDeduction, setPerHalfDayDeduction] = useState(0);

  const [salaryStructure, setSalaryStructure] = useState({
    basic_salary: 0,
    components: []
  });

  useEffect(() => {
    fetchEmployees();
    fetchSalaryTemplate();
  }, []);

  useEffect(() => {
    if (selectedEmployee && selectedMonth) {
      fetchUnpaidLeaves();
    }
  }, [selectedEmployee, selectedMonth]);

  const fetchSalaryTemplate = async () => {
    try {
      const response = await api.get('/salary-template');
      setSalaryTemplate(response.data);
    } catch (error) {
      console.error('Failed to load salary template:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  const fetchUnpaidLeaves = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const response = await api.get('/leaves/all');

      const employeeData = employees.find(e => e.id === selectedEmployee);
      const employeeEmail = employeeData?.email;

      const unpaidLeavesForMonth = (response.data || []).filter(leave => {
        if (leave.employee_email !== employeeEmail) return false;
        if (leave.leave_type !== 'Unpaid Leave') return false;
        if (leave.status === 'rejected') return false;

        return leave.dates?.some(dateStr => {
          const date = new Date(dateStr);
          return date.getFullYear() === parseInt(year) &&
            date.getMonth() + 1 === parseInt(month);
        });
      });

      let fullDays = 0;
      let halfDays = 0;

      unpaidLeavesForMonth.forEach(leave => {
        const daysInMonth = leave.dates?.filter(dateStr => {
          const date = new Date(dateStr);
          return date.getFullYear() === parseInt(year) &&
            date.getMonth() + 1 === parseInt(month);
        }).length || 0;

        if (leave.is_half_day) {
          halfDays += daysInMonth;
        } else {
          fullDays += daysInMonth;
        }
      });

      setUnpaidLeaves(unpaidLeavesForMonth);
      setUnpaidFullDays(fullDays);
      setUnpaidHalfDays(halfDays);
    } catch (error) {
      console.error('Failed to fetch unpaid leaves:', error);
      setUnpaidLeaves([]);
      setUnpaidFullDays(0);
      setUnpaidHalfDays(0);
    }
  };

  const handleEmployeeChange = async (empId) => {
    setSelectedEmployee(empId);
    const empData = employees.find(e => e.id === empId);
    setSelectedEmployeeData(empData);
    setLoading(true);

    // Reset deduction rates when employee changes
    setPerFullDayDeduction(0);
    setPerHalfDayDeduction(0);

    try {
      const response = await api.get(`/salary-structure/${empId}`);
      if (response.data) {
        setSalaryStructure({
          basic_salary: response.data.basic_salary || 0,
          components: response.data.components || []
        });

        // Set default deduction rates based on basic salary / 30
        const basic = response.data.basic_salary || 0;
        const defaultPerDay = Math.round(basic / 30);
        setPerFullDayDeduction(defaultPerDay);
        setPerHalfDayDeduction(Math.round(defaultPerDay / 2));
      } else {
        initializeFromTemplate(empData);
      }
    } catch (error) {
      console.error(error);
      initializeFromTemplate(empData);
    } finally {
      setLoading(false);
    }
  };

  const initializeFromTemplate = (employee) => {
    const basicSalary = employee?.monthly_salary || 0;
    let initialComponents = [];

    if (salaryTemplate) {
      if (salaryTemplate.earnings) {
        initialComponents = initialComponents.concat(
          salaryTemplate.earnings.map(earning => ({
            name: earning.name,
            amount: 0,
            type: 'earning',
            is_percentage: false,
            calculation_base: 'basic'
          }))
        );
      }

      if (salaryTemplate.deductions) {
        initialComponents = initialComponents.concat(
          salaryTemplate.deductions.map(deduction => ({
            name: deduction.name,
            amount: 0,
            type: 'deduction',
            is_percentage: false,
            calculation_base: 'basic'
          }))
        );
      }
    }

    setSalaryStructure({
      basic_salary: basicSalary,
      components: initialComponents
    });

    // Set default deduction rates
    const defaultPerDay = Math.round(basicSalary / 30);
    setPerFullDayDeduction(defaultPerDay);
    setPerHalfDayDeduction(Math.round(defaultPerDay / 2));
  };

  const addComponent = (type) => {
    setSalaryStructure({
      ...salaryStructure,
      components: [
        ...salaryStructure.components,
        {
          name: '',
          amount: 0,
          type: type,
          is_percentage: false,
          calculation_base: 'basic'
        }
      ]
    });
  };

  const updateComponent = (index, field, value) => {
    const updated = [...salaryStructure.components];
    updated[index][field] = value;
    setSalaryStructure({ ...salaryStructure, components: updated });
  };

  const removeComponent = (index) => {
    const updated = salaryStructure.components.filter((_, i) => i !== index);
    setSalaryStructure({ ...salaryStructure, components: updated });
  };

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split('-');
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const calculateUnpaidDeduction = () => {
    if (!deductUnpaidLeaves) return 0;

    const fullDayDeduction = unpaidFullDays * (parseFloat(perFullDayDeduction) || 0);
    const halfDayDeduction = unpaidHalfDays * (parseFloat(perHalfDayDeduction) || 0);

    return Math.round(fullDayDeduction + halfDayDeduction);
  };

  const getTotalUnpaidDays = () => {
    return unpaidFullDays + (unpaidHalfDays * 0.5);
  };

  const calculateTotals = () => {
    const basic = parseFloat(salaryStructure.basic_salary) || 0;
    let totalEarnings = basic;
    let totalDeductions = 0;

    salaryStructure.components.forEach(comp => {
      const amount = parseFloat(comp.amount) || 0;
      let calcAmount = amount;

      if (comp.is_percentage && comp.calculation_base === 'basic') {
        calcAmount = (basic * amount) / 100;
      }

      if (comp.type === 'earning') {
        totalEarnings += calcAmount;
      } else {
        totalDeductions += calcAmount;
      }
    });

    const grossSalary = totalEarnings;
    const unpaidDeduction = calculateUnpaidDeduction();
    const finalDeductions = totalDeductions + unpaidDeduction;

    return {
      basic,
      grossSalary,
      totalDeductions,
      unpaidDeduction,
      finalDeductions,
      netSalary: grossSalary - finalDeductions
    };
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (salaryStructure.basic_salary <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/salary-structure/${selectedEmployee}`, salaryStructure);
      toast.success('Salary structure saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendSlip = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    setSending(true);
    try {
      const totals = calculateTotals();
      await api.post('/payroll/send-detailed-salary-slip', {
        employee_id: selectedEmployee,
        month: selectedMonth,
        unpaid_full_days: deductUnpaidLeaves ? unpaidFullDays : 0,
        unpaid_half_days: deductUnpaidLeaves ? unpaidHalfDays : 0,
        per_full_day_deduction: deductUnpaidLeaves ? parseFloat(perFullDayDeduction) || 0 : 0,
        per_half_day_deduction: deductUnpaidLeaves ? parseFloat(perHalfDayDeduction) || 0 : 0,
        unpaid_leave_deduction: deductUnpaidLeaves ? totals.unpaidDeduction : 0
      });
      toast.success('Salary slip sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send salary slip');
    } finally {
      setSending(false);
    }
  };

  const totals = calculateTotals();
  const monthName = selectedMonth ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy') : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-slate-800 rounded-xl shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Salary Structure
              </h1>
              <p className="text-slate-600">Configure detailed salary components for employees</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">About Salary Components</p>
              <p>
                When you select an employee for the first time, the system automatically loads the
                <strong> Salary Template</strong>. You can customize amounts for each component and configure unpaid leave deductions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="lg:col-span-2 border-0 shadow-md bg-white">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-lg">
                  <User className="w-5 h-5 text-slate-700" />
                </div>
                <CardTitle className="text-xl">Configure Salary Components</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Employee & Month Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Select Employee *</Label>
                  <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 transition-colors">
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-medium text-white">
                              {emp.full_name?.charAt(0)}
                            </div>
                            <span>{emp.full_name}</span>
                            <span className="text-slate-400 text-sm">({emp.employee_id || emp.id.slice(0, 8)})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 block">Salary Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-11 bg-slate-50 border-slate-200 hover:border-slate-300 transition-colors"
                  />
                </div>
              </div>

              {selectedEmployee && !loading && (
                <>
                  {/* Basic Salary Card */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <Label className="text-lg font-semibold text-white">Basic Salary</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-white/60">₹</span>
                      <Input
                        type="number"
                        value={salaryStructure.basic_salary}
                        onChange={(e) => setSalaryStructure({ ...salaryStructure, basic_salary: parseFloat(e.target.value) || 0 })}
                        className="text-2xl font-bold h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20"
                      />
                    </div>
                  </div>

                  {/* Unpaid Leave Deduction Section */}
                  <div className={`rounded-xl border-2 transition-all duration-300 overflow-hidden ${deductUnpaidLeaves && (unpaidFullDays > 0 || unpaidHalfDays > 0) ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl transition-colors ${deductUnpaidLeaves && (unpaidFullDays > 0 || unpaidHalfDays > 0) ? 'bg-amber-200' : 'bg-slate-200'}`}>
                            <Calendar className={`w-5 h-5 ${deductUnpaidLeaves && (unpaidFullDays > 0 || unpaidHalfDays > 0) ? 'text-amber-700' : 'text-slate-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 text-lg">Unpaid Leave Deduction</h3>
                            <p className="text-sm text-slate-600">
                              {(unpaidFullDays > 0 || unpaidHalfDays > 0)
                                ? <span className="font-medium text-amber-700">
                                  {unpaidFullDays > 0 && `${unpaidFullDays} full day${unpaidFullDays !== 1 ? 's' : ''}`}
                                  {unpaidFullDays > 0 && unpaidHalfDays > 0 && ', '}
                                  {unpaidHalfDays > 0 && `${unpaidHalfDays} half day${unpaidHalfDays !== 1 ? 's' : ''}`}
                                  {' in '}{monthName}
                                </span>
                                : <span className="text-slate-500">No unpaid leaves in {monthName}</span>
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {(unpaidFullDays > 0 || unpaidHalfDays > 0) && (
                            <Badge className={`text-sm px-3 py-1 ${deductUnpaidLeaves ? 'bg-amber-600 hover:bg-amber-600' : 'bg-slate-400 hover:bg-slate-400'}`}>
                              {deductUnpaidLeaves ? `- ₹${totals.unpaidDeduction.toLocaleString()}` : 'Not Applied'}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-slate-600">Apply</Label>
                            <Switch
                              checked={deductUnpaidLeaves}
                              onCheckedChange={setDeductUnpaidLeaves}
                              disabled={unpaidFullDays === 0 && unpaidHalfDays === 0}
                              className="data-[state=checked]:bg-amber-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Manual Deduction Rate Inputs */}
                      {deductUnpaidLeaves && (unpaidFullDays > 0 || unpaidHalfDays > 0) && (
                        <div className="mt-5 pt-5 border-t border-amber-200 space-y-4">
                          <div>
                            <Label className="text-sm font-semibold text-amber-800 mb-3 block">
                              Configure Deduction Rates
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Per Full Day Deduction */}
                              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Per Full Day Deduction
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-amber-600">₹</span>
                                  <Input
                                    type="number"
                                    value={perFullDayDeduction}
                                    onChange={(e) => setPerFullDayDeduction(parseFloat(e.target.value) || 0)}
                                    className="bg-amber-50 border-amber-200 focus:border-amber-400 focus:ring-amber-200 font-semibold"
                                    placeholder="Enter amount"
                                  />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  Applied to {unpaidFullDays} full day{unpaidFullDays !== 1 ? 's' : ''}
                                </p>
                              </div>

                              {/* Per Half Day Deduction */}
                              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Per Half Day Deduction
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-amber-600">₹</span>
                                  <Input
                                    type="number"
                                    value={perHalfDayDeduction}
                                    onChange={(e) => setPerHalfDayDeduction(parseFloat(e.target.value) || 0)}
                                    className="bg-amber-50 border-amber-200 focus:border-amber-400 focus:ring-amber-200 font-semibold"
                                    placeholder="Enter amount"
                                  />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                  Applied to {unpaidHalfDays} half day{unpaidHalfDays !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Calculation Preview */}
                          <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                            <div className="text-xs text-amber-700 font-semibold mb-3 uppercase tracking-wide">Calculation Preview</div>
                            <div className="space-y-2">
                              {unpaidFullDays > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Full Days ({unpaidFullDays} × ₹{parseFloat(perFullDayDeduction).toLocaleString()}):</span>
                                  <span className="font-semibold text-slate-800">
                                    ₹{(unpaidFullDays * (parseFloat(perFullDayDeduction) || 0)).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {unpaidHalfDays > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Half Days ({unpaidHalfDays} × ₹{parseFloat(perHalfDayDeduction).toLocaleString()}):</span>
                                  <span className="font-semibold text-slate-800">
                                    ₹{(unpaidHalfDays * (parseFloat(perHalfDayDeduction) || 0)).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between pt-3 mt-2 border-t border-amber-100">
                                <span className="font-semibold text-amber-800">Total Deduction:</span>
                                <span className="font-bold text-lg text-amber-700">₹{totals.unpaidDeduction.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Show Leave Details Toggle */}
                          <button
                            type="button"
                            onClick={() => setShowLeaveDetails(!showLeaveDetails)}
                            className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 transition-colors font-medium"
                          >
                            {showLeaveDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showLeaveDetails ? 'Hide' : 'View'} Leave Details
                          </button>

                          {/* Leave Details */}
                          {showLeaveDetails && unpaidLeaves.length > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                              {unpaidLeaves.map((leave, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-700">
                                      {leave.dates?.length} day{leave.dates?.length !== 1 ? 's' : ''}
                                      {leave.is_half_day && <span className="text-amber-600 ml-1">(Half Day)</span>}
                                    </span>
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {leave.status?.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-slate-500 text-sm mb-2">{leave.reason}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {leave.dates?.map((date, i) => (
                                      <span key={i} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                                        {format(new Date(date), 'MMM dd')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Earnings Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-slate-800">Earnings</h3>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                          {salaryStructure.components.filter(c => c.type === 'earning').length} items
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addComponent('earning')}
                        className="bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-md"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Earning
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {salaryStructure.components.filter(c => c.type === 'earning').map((comp, idx) => {
                        const actualIdx = salaryStructure.components.indexOf(comp);
                        const calcAmount = comp.is_percentage
                          ? Math.round((totals.basic * (parseFloat(comp.amount) || 0)) / 100)
                          : parseFloat(comp.amount) || 0;

                        return (
                          <div key={actualIdx} className="border border-emerald-200 rounded-xl p-4 bg-gradient-to-r from-emerald-50/50 to-green-50/50 hover:shadow-md transition-all duration-200">
                            <div className="grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-12 md:col-span-4">
                                <Input
                                  placeholder="Component name"
                                  value={comp.name}
                                  onChange={(e) => updateComponent(actualIdx, 'name', e.target.value)}
                                  className="bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
                                />
                              </div>
                              <div className="col-span-5 md:col-span-3">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={comp.amount}
                                    onChange={(e) => updateComponent(actualIdx, 'amount', parseFloat(e.target.value) || 0)}
                                    className="bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200 pr-8"
                                  />
                                  {comp.is_percentage && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">%</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <Select
                                  value={comp.is_percentage ? 'percentage' : 'fixed'}
                                  onValueChange={(val) => updateComponent(actualIdx, 'is_percentage', val === 'percentage')}
                                >
                                  <SelectTrigger className="bg-white border-emerald-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed ₹</SelectItem>
                                    <SelectItem value="percentage">% Basic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 md:col-span-2 text-right">
                                <span className="text-base font-bold text-emerald-700">
                                  +₹{calcAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="col-span-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeComponent(actualIdx)}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {salaryStructure.components.filter(c => c.type === 'earning').length === 0 && (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">No earnings added</p>
                          <p className="text-sm">Click "Add Earning" to create one</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-red-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-slate-800">Deductions</h3>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">
                          {salaryStructure.components.filter(c => c.type === 'deduction').length} items
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addComponent('deduction')}
                        variant="destructive"
                        className="rounded-full shadow-md"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Deduction
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {salaryStructure.components.filter(c => c.type === 'deduction').map((comp, idx) => {
                        const actualIdx = salaryStructure.components.indexOf(comp);
                        const calcAmount = comp.is_percentage
                          ? Math.round((totals.basic * (parseFloat(comp.amount) || 0)) / 100)
                          : parseFloat(comp.amount) || 0;

                        return (
                          <div key={actualIdx} className="border border-red-200 rounded-xl p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 hover:shadow-md transition-all duration-200">
                            <div className="grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-12 md:col-span-4">
                                <Input
                                  placeholder="Component name"
                                  value={comp.name}
                                  onChange={(e) => updateComponent(actualIdx, 'name', e.target.value)}
                                  className="bg-white border-red-200 focus:border-red-400 focus:ring-red-200"
                                />
                              </div>
                              <div className="col-span-5 md:col-span-3">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={comp.amount}
                                    onChange={(e) => updateComponent(actualIdx, 'amount', parseFloat(e.target.value) || 0)}
                                    className="bg-white border-red-200 focus:border-red-400 focus:ring-red-200 pr-8"
                                  />
                                  {comp.is_percentage && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 font-bold">%</span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-4 md:col-span-2">
                                <Select
                                  value={comp.is_percentage ? 'percentage' : 'fixed'}
                                  onValueChange={(val) => updateComponent(actualIdx, 'is_percentage', val === 'percentage')}
                                >
                                  <SelectTrigger className="bg-white border-red-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed ₹</SelectItem>
                                    <SelectItem value="percentage">% Basic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 md:col-span-2 text-right">
                                <span className="text-base font-bold text-red-600">
                                  -₹{calcAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="col-span-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeComponent(actualIdx)}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {salaryStructure.components.filter(c => c.type === 'deduction').length === 0 && (
                        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">No deductions added</p>
                          <p className="text-sm">Click "Add Deduction" to create one</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Salary Structure'}
                  </Button>
                </>
              )}

              {loading && (
                <div className="text-center py-16 text-slate-500">
                  <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full mx-auto mb-4"></div>
                  <p className="font-medium">Loading salary structure...</p>
                </div>
              )}

              {!selectedEmployee && !loading && (
                <div className="text-center py-16 text-slate-400">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="font-medium text-lg text-slate-500">No Employee Selected</p>
                  <p className="text-sm">Select an employee to configure their salary structure</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Panel */}
          <div className="space-y-6">
            {/* Salary Summary Card */}
            <Card className="border-0 shadow-md sticky top-4 overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Salary Summary</CardTitle>
                    {selectedEmployee && (
                      <p className="text-sm text-slate-300 mt-0.5">{monthName}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {selectedEmployee ? (
                  <>
                    {/* Employee Info */}
                    {selectedEmployeeData && (
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-bold shadow-md">
                          {selectedEmployeeData.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{selectedEmployeeData.full_name}</p>
                          <p className="text-xs text-slate-500">{selectedEmployeeData.department || 'No Department'}</p>
                        </div>
                      </div>
                    )}

                    {/* Salary Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between py-3 px-4 bg-slate-50 rounded-xl">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-bold text-slate-800">₹{totals.basic.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-emerald-700 font-medium">Gross Salary</span>
                        <span className="font-bold text-emerald-700">₹{totals.grossSalary.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between py-3 px-4 bg-red-50 rounded-xl border border-red-100">
                        <span className="text-red-700 font-medium">Regular Deductions</span>
                        <span className="font-bold text-red-700">- ₹{totals.totalDeductions.toLocaleString()}</span>
                      </div>

                      {deductUnpaidLeaves && (unpaidFullDays > 0 || unpaidHalfDays > 0) && (
                        <div className="flex justify-between py-3 px-4 bg-amber-50 rounded-xl border border-amber-200">
                          <div>
                            <span className="text-amber-700 font-medium">Unpaid Leave</span>
                            <span className="text-xs text-amber-600 ml-1.5 bg-amber-100 px-2 py-0.5 rounded-full">
                              {getTotalUnpaidDays()} days
                            </span>
                          </div>
                          <span className="font-bold text-amber-700">- ₹{totals.unpaidDeduction.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between py-5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg">
                        <span className="font-bold text-lg">Net Salary</span>
                        <span className="font-bold text-2xl">₹{totals.netSalary.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Send Slip Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                        <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Salary Slip
                        </h4>
                        <Button
                          onClick={handleSendSlip}
                          disabled={sending || !selectedEmployee}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 font-semibold shadow-md"
                        >
                          {sending ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send to Employee
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-emerald-600 mt-2 text-center">
                          Salary slip will be sent via email
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-medium">No Employee Selected</p>
                    <p className="text-sm mt-1">Select an employee to view summary</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {selectedEmployee && (
              <Card className="border-0 shadow-md">
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wide">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl text-center border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-700">
                        {salaryStructure.components.filter(c => c.type === 'earning').length}
                      </p>
                      <p className="text-xs text-emerald-600 font-medium">Earnings</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl text-center border border-red-100">
                      <p className="text-2xl font-bold text-red-700">
                        {salaryStructure.components.filter(c => c.type === 'deduction').length}
                      </p>
                      <p className="text-xs text-red-600 font-medium">Deductions</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center border border-amber-100">
                      <p className="text-2xl font-bold text-amber-700">
                        {unpaidFullDays}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">Full Days</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-center border border-blue-100">
                      <p className="text-2xl font-bold text-blue-700">
                        {unpaidHalfDays}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">Half Days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryStructurePage;
