import { X, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import type { GeneralWaitlistAnalysis } from '../lib/waitlist-agents';

interface WaitlistAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: GeneralWaitlistAnalysis | null;
  loading?: boolean;
}

export function WaitlistAnalysisModal({
  isOpen,
  onClose,
  analysis,
  loading = false,
}: WaitlistAnalysisModalProps) {
  if (!isOpen) return null;

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
        <div className="px-6 py-4 border-b border-gray-200 bg-black text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Waitlist Priority Analysis</h2>
              {analysis && (
                <p className="text-sm text-gray-300 mt-1">
                  {analysis.total_patients} patients analyzed
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-gray-800 animate-spin" />
                <p className="text-gray-600">Analyzing waitlist with AI...</p>
              </div>
            </div>
          ) : !analysis ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No analysis available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Priority Patients Table */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  Prioritized Patient List
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Patient
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Urgency
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Wait Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Chief Complaint
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Clinical Summary
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analysis.priority_patients.map((patient) => (
                        <tr key={patient.waitlist_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                              <span className="text-sm font-bold text-gray-700">
                                #{patient.ranking}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.patient_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {patient.provider_preference}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeColor(
                                patient.priority_score
                              )}`}
                            >
                              {patient.priority_score}/100
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(
                                patient.urgency_level
                              )}`}
                            >
                              {patient.urgency_level}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{patient.wait_time_days} days</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">
                              {patient.chief_complaint}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              {patient.clinical_summary ? (
                                <ul className="text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
                                  {patient.clinical_summary.split('. ').filter(s => s.trim()).map((sentence, idx) => (
                                    <li key={idx}>{sentence.trim()}{sentence.endsWith('.') ? '' : '.'}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-sm text-gray-500">No summary available</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {analysis
                ? `${analysis.priority_patients.filter((p) => p.urgency_level === 'Critical' || p.urgency_level === 'High').length} urgent patients`
                : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
