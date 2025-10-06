import { X, Calendar, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Loader2, FileText, UserPlus } from 'lucide-react';
import type { DailySummary } from '../types/schema';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailySummary | null;
  loading: boolean;
  providerName: string;
  date: string;
}

export function DailySummaryModal({
  isOpen,
  onClose,
  summary,
  loading,
  providerName,
  date
}: DailySummaryModalProps) {
  if (!isOpen) return null;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-red-100 text-red-800 border-red-300';
    if (score >= 75) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-black text-white">
          <div>
            <h2 className="text-xl font-semibold">Daily Briefing - {providerName}</h2>
            <p className="text-sm text-gray-300 mt-1">{formatDate(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
              <span className="ml-3 text-gray-600">Generating daily summary...</span>
            </div>
          ) : !summary ? (
            <div className="text-center py-12 text-gray-500">
              No summary generated yet
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-gray-50 border border-black rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-black" />
                  <h3 className="text-lg font-semibold text-black">Executive Summary</h3>
                </div>
                <ul className="space-y-2">
                  {summary.executive_summary.split(/(?<!\bDr|\bMr|\bMs|\bMrs)\.(?=\s+[A-Z])/).filter(s => s.trim()).map((sentence, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-black mt-0.5">•</span>
                      <span>{sentence.trim()}{sentence.endsWith('.') ? '' : '.'}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 uppercase">Total Appointments</span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_appointments}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {summary.new_patients} new • {summary.returning_patients} returning
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 uppercase">Waitlist</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.waitlist_count}</div>
                  <div className="text-xs text-gray-500 mt-1">Patients waiting</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 uppercase">High Risk</span>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.high_risk_patients}</div>
                  <div className="text-xs text-gray-500 mt-1">New patient opportunities</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 uppercase">Utilization</span>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.utilization_percentage.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {summary.total_scheduled_hours.toFixed(1)} / {summary.total_available_hours.toFixed(1)} hrs
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 uppercase">Projected Utilization</span>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const avgAppointmentDuration = summary.total_scheduled_hours / summary.total_appointments;
                      const additionalHours = avgAppointmentDuration * 3;
                      const newUtilization = ((summary.total_scheduled_hours + additionalHours) / summary.total_available_hours) * 100;
                      return Math.min(newUtilization, 100).toFixed(0);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    With 3 waitlist patients
                  </div>
                </div>
              </div>

              {/* Risk Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-red-700">{summary.high_risk_count}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">High Risk</div>
                      <div className="text-xs text-gray-500">
                        {summary.total_appointments > 0
                          ? Math.round((summary.high_risk_count / summary.total_appointments) * 100)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-yellow-700">{summary.medium_risk_count}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Medium Risk</div>
                      <div className="text-xs text-gray-500">
                        {summary.total_appointments > 0
                          ? Math.round((summary.medium_risk_count / summary.total_appointments) * 100)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-green-700">{summary.low_risk_count}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Low Risk</div>
                      <div className="text-xs text-gray-500">
                        {summary.total_appointments > 0
                          ? Math.round((summary.low_risk_count / summary.total_appointments) * 100)
                          : 0}% of total
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Break Hours */}
              {summary.break_hours.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Break Hours (Gaps in Schedule)</h3>
                  </div>
                  <div className="space-y-2">
                    {summary.break_hours.map((breakHour, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-700">
                          {formatTime(breakHour.start_time)} - {formatTime(breakHour.end_time)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {breakHour.duration_mins} minutes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Priority Waitlist Patients */}
              {summary.top_waitlist_matches && summary.top_waitlist_matches.length > 0 && (
                <div className="bg-white border border-black rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-5 h-5 text-black" />
                    <h3 className="text-sm font-semibold text-black">Top Priority Waitlist Patients</h3>
                    <span className="text-xs text-gray-500">(Available to fill high-risk slots)</span>
                  </div>
                  <div className="space-y-3">
                    {summary.top_waitlist_matches.map((patient) => (
                      <div
                        key={patient.waitlist_id}
                        className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-black"
                      >
                        {/* Ranking Badge */}
                        <div className="flex-shrink-0 w-10 h-10 bg-black rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-white">#{patient.ranking}</span>
                        </div>

                        {/* Patient Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-black">{patient.patient_name}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                            <div>
                              <span className="text-gray-500">Chief Complaint:</span>
                              <span className="ml-1 text-black font-medium">{patient.chief_complaint}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Wait Time:</span>
                              <span className="ml-1 text-black font-medium">{patient.wait_time_days} days</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-700">
                            <span className="font-medium text-black">Clinical Summary:</span> {patient.clinical_summary}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient Schedule */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Patient Schedule</h3>
                <div className="space-y-2">
                  {summary.patient_summaries.map((patient, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-sm font-medium text-gray-900 w-20">
                          {formatTime(patient.scheduled_time)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{patient.patient_name}</div>
                          <div className="text-xs text-gray-500">{patient.chief_complaint}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            patient.is_new_patient
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {patient.is_new_patient ? 'New' : 'Returning'}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            patient.risk_level === 'High'
                              ? 'bg-red-100 text-red-700'
                              : patient.risk_level === 'Medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : patient.risk_level === 'Low'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {patient.risk_level}
                        </span>
                        {patient.virtual_eligible && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Virtual OK
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 text-white bg-black hover:bg-gray-900 rounded-lg font-medium transition-colors"
              >
                Print Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
