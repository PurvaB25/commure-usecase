import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, AlertTriangle, CheckCircle2, XCircle, Phone, Mail, MapPin, Car, Bike, Bus, Loader2, Activity, HelpCircle } from 'lucide-react';

interface AppointmentDetails {
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  patient_name: string;
  age: number;
  distance_miles: number;
  zip_code: string;
  phone: string;
  email: string;
  commute_type: string;
  preferred_virtual: number;
  provider_name: string;
  provider_specialty: string;
  scheduled_time: string;
  appointment_type: string;
  chief_complaint: string;
  status: string;
  risk_score: number | null;
  risk_badge: string | null;
  primary_risk_factor: string | null;
  secondary_risk_factor: string | null;
  contributing_factors: string | null;
  predicted_show_probability: number | null;
  weather_condition: string | null;
  weather_impact_score: number | null;
  virtual_eligible: number | null;
  virtual_reason: string | null;
  virtual_confidence: number | null;
  total_appointments: number | null;
  completed: number | null;
  no_shows: number | null;
  no_show_rate: number | null;
  last_appointment_date: string | null;
  recent_reschedules: number | null;
}

export function PatientDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await fetch(`http://localhost:3001/api/appointments/${appointmentId}/details`);
        if (!response.ok) {
          throw new Error('Failed to fetch appointment details');
        }
        const data = await response.json();
        setDetails(data);
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      } finally {
        setLoading(false);
      }
    }

    if (appointmentId) {
      fetchDetails();
    }
  }, [appointmentId]);

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCommuteIcon = (commuteType: string) => {
    switch (commuteType) {
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'bike':
        return <Bike className="w-4 h-4" />;
      case 'public_transport':
        return <Bus className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const getRiskBadgeColor = (badge: string | null) => {
    if (!badge) return 'bg-gray-100 text-gray-600 border-gray-200';
    switch (badge) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Appointment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Patient Details</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Admin</span>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                AD
              </div>
              <button
                onClick={() => navigate('/help')}
                className="bg-black text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-gray-800 transition-all flex items-center gap-1"
                title="Help & Agent Guide"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Info & Appointment */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{details.patient_name}</h2>
                  <p className="text-sm text-gray-600">{details.age} years old</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Phone</div>
                    <div className="text-gray-900 font-medium">{details.phone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Email</div>
                    <div className="text-gray-900 font-medium">{details.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Location</div>
                    <div className="text-gray-900 font-medium">
                      {details.zip_code} • {details.distance_miles} miles away
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  {getCommuteIcon(details.commute_type)}
                  <div>
                    <div className="text-gray-600">Commute Type</div>
                    <div className="text-gray-900 font-medium capitalize">
                      {details.commute_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <Activity className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Virtual Preference</div>
                    <div className="text-gray-900 font-medium">
                      {details.preferred_virtual ? 'Prefers Virtual' : 'Prefers In-Person'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Appointment Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Current Appointment</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Date & Time</div>
                  <div className="text-sm text-gray-900 font-medium mt-1">
                    {formatDateTime(details.scheduled_time)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Provider</div>
                  <div className="text-sm text-gray-900 font-medium mt-1">
                    {details.provider_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{details.provider_specialty}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Type</div>
                  <div className="text-sm text-gray-900 font-medium mt-1">
                    {details.appointment_type}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Chief Complaint</div>
                  <div className="text-sm text-gray-900 font-medium mt-1">
                    {details.chief_complaint}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Status</div>
                  <div className="text-sm text-gray-900 font-medium mt-1 capitalize">
                    {details.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Patient History Card */}
            {details.total_appointments !== null && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient History</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Appointments</span>
                    <span className="text-sm font-semibold text-gray-900">{details.total_appointments}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-sm font-semibold text-green-600">{details.completed}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">No-Shows</span>
                    <span className="text-sm font-semibold text-red-600">{details.no_shows}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">No-Show Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {details.no_show_rate ? `${Math.round(details.no_show_rate * 100)}%` : '0%'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Recent Reschedules</span>
                    <span className="text-sm font-semibold text-gray-900">{details.recent_reschedules || 0}</span>
                  </div>

                  {details.last_appointment_date && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-600">Last Appointment</span>
                      <div className="text-sm text-gray-900 font-medium mt-1">
                        {new Date(details.last_appointment_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Risk Analysis & Virtual Eligibility */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Score Analysis Card */}
            {details.risk_score !== null ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Risk Score Analysis</h3>
                </div>

                {/* Risk Score Overview */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold border-2 ${getRiskBadgeColor(details.risk_badge)}`}>
                      {details.risk_badge}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-gray-900">{details.risk_score}/100</div>
                    <div className="text-sm text-gray-600 mt-1">Overall Risk Score</div>
                  </div>
                  {details.predicted_show_probability !== null && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(details.predicted_show_probability * 100)}%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Show Probability</div>
                    </div>
                  )}
                </div>

                {/* Risk Factors */}
                <div className="space-y-4">
                  {details.primary_risk_factor && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Primary Risk Factor
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-900 font-medium">{details.primary_risk_factor}</p>
                      </div>
                    </div>
                  )}

                  {details.secondary_risk_factor && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Secondary Risk Factor
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-900 font-medium">{details.secondary_risk_factor}</p>
                      </div>
                    </div>
                  )}

                  {details.contributing_factors && (() => {
                    try {
                      const factors = JSON.parse(details.contributing_factors);
                      if (Array.isArray(factors) && factors.length > 0) {
                        return (
                          <div>
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                              Contributing Factors
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <ul className="space-y-2">
                                {factors.map((factor: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error('Error parsing contributing_factors:', e);
                    }
                    return null;
                  })()}

                  {details.weather_condition && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Weather Impact
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <p className="text-sm text-gray-900 font-medium">{details.weather_condition}</p>
                        <span className="text-sm text-gray-600">
                          +{details.weather_impact_score || 0} risk points
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center text-gray-500">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No risk assessment available for this appointment</p>
                </div>
              </div>
            )}

            {/* Virtual Eligibility Card */}
            {details.virtual_eligible !== null ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Virtual Eligibility</h3>
                </div>

                {/* Eligibility Status */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {details.virtual_eligible ? (
                      <CheckCircle2 className="w-12 h-12 text-green-600" />
                    ) : (
                      <XCircle className="w-12 h-12 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-900">
                      {details.virtual_eligible ? 'Eligible' : 'Not Eligible'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">for Virtual Appointment</div>
                  </div>
                  {details.virtual_confidence !== null && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-purple-600">
                        {Math.round(details.virtual_confidence * 100)}%
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Confidence</div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                {details.virtual_reason && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Assessment Rationale
                    </div>
                    <div className={`border rounded-lg p-5 ${
                      details.virtual_eligible
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className={`text-sm leading-relaxed ${
                        details.virtual_eligible ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {/* Parse and format the reason text */}
                        {(() => {
                          const text = details.virtual_reason;

                          // Try splitting by semicolon first, then by period if no semicolons
                          let parts = text.split(';').map(p => p.trim()).filter(Boolean);
                          if (parts.length === 1) {
                            // Try splitting by period but keep sentence structure
                            parts = text.split('.').map(p => p.trim()).filter(Boolean);
                          }

                          if (parts.length > 1) {
                            return (
                              <div className="space-y-2.5">
                                {parts.map((part, idx) => {
                                  // First part gets special styling
                                  if (idx === 0) {
                                    return (
                                      <div key={idx} className="font-semibold text-base">
                                        {part}{!part.endsWith('.') && !part.endsWith(';') ? '.' : ''}
                                      </div>
                                    );
                                  }
                                  // Subsequent parts are formatted as bullet points
                                  return (
                                    <div key={idx} className="flex items-start gap-2 pl-1">
                                      <span className="text-base mt-0.5">•</span>
                                      <span className="flex-1">
                                        {part.charAt(0).toUpperCase() + part.slice(1)}{!part.endsWith('.') ? '.' : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else {
                            // Single sentence - just display nicely formatted
                            return (
                              <p className="font-medium leading-relaxed">
                                {text.charAt(0).toUpperCase() + text.slice(1)}
                              </p>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center text-gray-500">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No virtual eligibility assessment available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
