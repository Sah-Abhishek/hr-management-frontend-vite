import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';

const LeavePolicyPage = () => {
  const [policy, setPolicy] = useState({ policies: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingToAll, setApplyingToAll] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    loadLeavePolicy();
  }, []);

  const loadLeavePolicy = async () => {
    setLoading(true);
    try {
      // FIXED: Correct API path - routes are mounted at /leaves
      const response = await api.get('/leaves/leave-policy');
      setPolicy(response.data);
      if (response.data.updated_at) {
        setLastSaved(new Date(response.data.updated_at));
      }
    } catch (error) {
      console.error('Failed to load leave policy:', error);
      toast.error('Failed to load leave policy');
      // Set default if load fails
      setPolicy({
        policies: [
          { leave_type: 'Sick Leave', annual_quota: 12, order: 1 },
          { leave_type: 'Casual Leave', annual_quota: 12, order: 2 },
          { leave_type: 'Paid Leave', annual_quota: 15, order: 3 },
          { leave_type: 'Unpaid Leave', annual_quota: 0, order: 4 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // FIXED: Correct API path
      const response = await api.post('/leaves/leave-policy', policy);
      setLastSaved(new Date());
      toast.success('Leave policy updated successfully!');

      // Reload to get updated data
      await loadLeavePolicy();
    } catch (error) {
      console.error('Failed to save policy:', error);
      toast.error(error.response?.data?.detail || 'Failed to update leave policy');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!window.confirm('This will update leave balances for ALL employees to match the current policy. Are you sure?')) {
      return;
    }

    setApplyingToAll(true);
    try {
      // FIXED: Correct API path
      const response = await api.post('/leaves/leave-policy/apply-to-all');
      toast.success(response.data.message);
    } catch (error) {
      console.error('Failed to apply policy:', error);
      toast.error(error.response?.data?.detail || 'Failed to apply policy to employees');
    } finally {
      setApplyingToAll(false);
    }
  };

  const updateQuota = (index, value) => {
    const newPolicies = [...policy.policies];
    newPolicies[index].annual_quota = parseFloat(value) || 0;
    setPolicy({ ...policy, policies: newPolicies });
  };

  const getTotalDays = () => {
    return policy.policies.reduce((sum, p) => sum + (p.annual_quota || 0), 0);
  };

  const addLeaveType = () => {
    const newPolicies = [...policy.policies];
    newPolicies.push({
      leave_type: `New Leave Type ${newPolicies.length + 1}`,
      annual_quota: 0,
      order: newPolicies.length + 1
    });
    setPolicy({ ...policy, policies: newPolicies });
  };

  const updateLeaveTypeName = (index, name) => {
    const newPolicies = [...policy.policies];
    newPolicies[index].leave_type = name;
    setPolicy({ ...policy, policies: newPolicies });
  };

  const removeLeaveType = (index) => {
    if (!window.confirm(`Are you sure you want to remove "${policy.policies[index].leave_type}"?`)) {
      return;
    }
    const newPolicies = policy.policies.filter((_, i) => i !== index);
    setPolicy({ ...policy, policies: newPolicies });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading leave policy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Leave Policy Settings
          </h1>
          <p className="text-lg text-slate-600">Configure annual leave quotas for all employees</p>
          {lastSaved && (
            <p className="text-sm text-slate-500 mt-1">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Policy Configuration Card */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              <Settings className="w-6 h-6" />
              Annual Leave Quotas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                {policy.policies.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No leave types configured.</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addLeaveType}
                      className="mt-4"
                    >
                      Add Leave Type
                    </Button>
                  </div>
                ) : (
                  policy.policies.map((policyItem, index) => {
                    const colors = [
                      'bg-red-50 border-red-200 text-red-900',
                      'bg-blue-50 border-blue-200 text-blue-900',
                      'bg-emerald-50 border-emerald-200 text-emerald-900',
                      'bg-amber-50 border-amber-200 text-amber-900',
                      'bg-purple-50 border-purple-200 text-purple-900',
                      'bg-pink-50 border-pink-200 text-pink-900',
                    ];
                    const colorClass = colors[index % colors.length];

                    return (
                      <div key={index} className={`p-4 rounded-lg border ${colorClass}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor={`leave-name-${index}`} className="font-medium text-sm">
                            Leave Type Name
                          </Label>
                          <button
                            type="button"
                            onClick={() => removeLeaveType(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <Input
                          id={`leave-name-${index}`}
                          type="text"
                          value={policyItem.leave_type}
                          onChange={(e) => updateLeaveTypeName(index, e.target.value)}
                          className="mb-3 bg-white"
                          placeholder="e.g., Sick Leave"
                        />
                        <Label htmlFor={`leave-${index}`} className="font-medium text-sm">
                          Annual Quota (days/year)
                        </Label>
                        <Input
                          id={`leave-${index}`}
                          data-testid={`${policyItem.leave_type.toLowerCase().replace(/ /g, '-')}-input`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={policyItem.annual_quota}
                          onChange={(e) => updateQuota(index, e.target.value)}
                          className="mt-2 bg-white"
                        />
                        <p className="text-xs mt-1 opacity-70">
                          {policyItem.annual_quota === 0
                            ? 'Set to 0 for unlimited/unpaid leaves'
                            : `${policyItem.annual_quota} days per year`}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {policy.policies.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLeaveType}
                  className="w-full"
                >
                  + Add Another Leave Type
                </Button>
              )}

              <div className="pt-4 border-t border-slate-200">
                {policy.policies.length > 0 && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-semibold mb-1">How Leave Policy Works:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Save Policy</strong> - Saves the quota configuration (required first)</li>
                            <li><strong>Apply to All</strong> - Updates all existing employees to match this policy</li>
                            <li>New employees automatically get balances from this policy</li>
                            <li>Individual adjustments can be made from the Employees page</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        type="submit"
                        data-testid="save-policy-btn"
                        className="w-full bg-slate-800 hover:bg-slate-900"
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Leave Policy'}
                      </Button>

                      <Button
                        type="button"
                        onClick={handleApplyToAll}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={applyingToAll}
                        variant="default"
                      >
                        <Users className={`w-4 h-4 mr-2 ${applyingToAll ? 'animate-pulse' : ''}`} />
                        {applyingToAll ? 'Applying to All Employees...' : 'Apply to All Employees'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">
                Total Annual Leave Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Total Annual Leaves per Employee:</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {getTotalDays()} days
                  </span>
                </div>

                {policy.policies.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Breakdown:</p>
                    <div className="grid gap-2">
                      {policy.policies.map((p, idx) => (
                        <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                          <span className="text-slate-600">{p.leave_type}:</span>
                          <span className="font-medium">{p.annual_quota} days</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Calculated from all configured leave types above
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Policy Workflow</p>
                    <p className="text-sm text-blue-700 mt-1">
                      1. Configure leave types and quotas above<br />
                      2. Click "Save Leave Policy"<br />
                      3. Click "Apply to All Employees" to update existing employees
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={loadLeavePolicy}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Policy
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeavePolicyPage;
