import { useState, useEffect } from 'react';
import { X, Users, AlertCircle, Calendar, Clock } from 'lucide-react';

interface WaitlistPatient {
  waitlist_id: string;
  patient_name: string;
  preferred_timeframe: string;
  requested_provider: string;
  reason: string;
  added_at: string;
  chief_complaint: string;
}

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId?: string;
}

export function WaitlistModal({ isOpen, onClose, providerId }: WaitlistModalProps) {
  const [waitlistPatients, setWaitlistPatients] = useState<WaitlistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'waitTime' | 'timeframe'>('waitTime');

  useEffect(() => {
    if (isOpen) {
      fetchWaitlist();
    }
  }, [isOpen, providerId]);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const url = providerId
        ? `http://localhost:3001/api/waitlist?provider_id=${providerId}`
        : 'http://localhost:3001/api/waitlist';
      const response = await fetch(url);
      const data = await response.json();
      setWaitlistPatients(data);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'Within 1 week':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Within 2 weeks':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Within 1 month':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Flexible':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTimeframeValue = (timeframe: string) => {
    switch (timeframe) {
      case 'Within 1 week': return 1;
      case 'Within 2 weeks': return 2;
      case 'Within 1 month': return 3;
      case 'Flexible': return 4;
      default: return 5;
    }
  };

  const calculateWaitDays = (addedAt: string) => {
    return Math.floor((new Date().getTime() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedPatients = [...waitlistPatients].sort((a, b) => {
    if (sortBy === 'waitTime') {
      return calculateWaitDays(b.added_at) - calculateWaitDays(a.added_at); // Longest wait first
    } else {
      return getTimeframeValue(a.preferred_timeframe) - getTimeframeValue(b.preferred_timeframe); // Most urgent first
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Waitlist Patients</h2>
              <p className="text-sm text-gray-300 mt-0.5">
                {waitlistPatients.length} patients waiting for appointments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sorting Controls */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('waitTime')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  sortBy === 'waitTime'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Wait Time
              </button>
              <button
                onClick={() => setSortBy('timeframe')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  sortBy === 'timeframe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Timeframe
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading waitlist...</div>
            </div>
          ) : waitlistPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No patients on waitlist</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPatients.map((patient) => (
                <div
                  key={patient.waitlist_id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {patient.patient_name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTimeframeColor(
                            patient.preferred_timeframe
                          )}`}
                        >
                          {patient.preferred_timeframe}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Waiting: {calculateWaitDays(patient.added_at)} days
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Added: {formatDate(patient.added_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      Reason
                    </div>
                    <div className="text-sm text-gray-900">{patient.reason}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Provider: <span className="font-medium text-gray-900">{patient.requested_provider}</span>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                      Fill Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <span>Patients are sorted by {sortBy === 'waitTime' ? 'wait time (longest first)' : 'preferred timeframe (most urgent first)'}</span>
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
