import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, AlertTriangle, UserPlus, Loader2, Info, ListChecks, Cloud, CloudRain, CloudSnow, Sun, FileText, HelpCircle } from 'lucide-react';
import { generateRiskScore, assessVirtualEligibility, generateBulkCampaigns, generateDailySummary } from '../lib/agents';
import { getPatientWithHistory, saveRiskAssessment } from '../lib/api';
import { analyzeGeneralWaitlist, type WaitlistPatient, type GeneralWaitlistAnalysis } from '../lib/waitlist-agents';
import { CampaignModal } from '../components/CampaignModal';
import { WaitlistModal } from '../components/WaitlistModal';
import { WaitlistAnalysisModal } from '../components/WaitlistAnalysisModal';
import { DailySummaryModal } from '../components/DailySummaryModal';
import type { BulkCampaignResult, DailySummary } from '../types/schema';

interface Appointment {
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  patient_name: string;
  chief_complaint: string;
  scheduled_time: string;
  booked_at: string;
  appointment_type: string;
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
  commute_type: string;
  provider_name: string;
}

interface KPIs {
  total_appointments: number;
  high_risk_patients: number;
  waitlist_count: number;
}

interface Weather {
  weather_id: string;
  date: string;
  zip_code: string;
  condition: string;
  temperature_f: number;
  precipitation_pct: number;
}

export function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || '';
  const providerId = searchParams.get('provider_id') || '';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [kpis, setKPIs] = useState<KPIs>({ total_appointments: 0, high_risk_patients: 0, waitlist_count: 0 });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingRisk, setGeneratingRisk] = useState(false);
  const [riskProgress, setRiskProgress] = useState({ current: 0, total: 0 });
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [bulkCampaigns, setBulkCampaigns] = useState<BulkCampaignResult | null>(null);
  const [generatingCampaigns, setGeneratingCampaigns] = useState(false);
  const [waitlistAnalysisModalOpen, setWaitlistAnalysisModalOpen] = useState(false);
  const [waitlistAnalysis, setWaitlistAnalysis] = useState<GeneralWaitlistAnalysis | null>(null);
  const [analyzingWaitlist, setAnalyzingWaitlist] = useState(false);
  const [dailySummaryModalOpen, setDailySummaryModalOpen] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gpt-5-nano' | 'gpt-4.1'>('gpt-4.1');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch appointments
        const apptResponse = await fetch(
          `http://localhost:3001/api/appointments?date=${date}&provider_id=${providerId}`
        );
        const apptData = await apptResponse.json();
        setAppointments(apptData);

        // Fetch KPIs
        const kpiResponse = await fetch(
          `http://localhost:3001/api/kpis?date=${date}&provider_id=${providerId}`
        );
        const kpiData = await kpiResponse.json();
        setKPIs(kpiData);

        // Fetch weather for the date (using a default zip code)
        const weatherResponse = await fetch(
          `http://localhost:3001/api/weather?date=${date}&zip_code=10001`
        );
        const weatherData = await weatherResponse.json();
        setWeather(weatherData);

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      }
    }

    if (date && providerId) {
      fetchData();
    }
  }, [date, providerId]);

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

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Sunny':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'Rainy':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'Snowy':
        return <CloudSnow className="w-5 h-5 text-blue-300" />;
      case 'Cloudy':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleGenerateCampaigns = async () => {
    setGeneratingCampaigns(true);
    setCampaignModalOpen(true);

    try {
      const campaigns = await generateBulkCampaigns(
        date,
        providerName,
        weather?.condition,
        weather?.temperature_f,
        selectedModel
      );
      setBulkCampaigns(campaigns);
    } catch (error) {
      console.error('Failed to generate campaigns:', error);
      alert('Failed to generate campaigns. Please try again.');
      setCampaignModalOpen(false);
    } finally {
      setGeneratingCampaigns(false);
    }
  };

  const handleGeneralWaitlistAnalysis = async () => {
    setAnalyzingWaitlist(true);
    setWaitlistAnalysisModalOpen(true);

    try {
      // Fetch waitlist patients FOR THIS PROVIDER ONLY
      const waitlistResponse = await fetch(`http://localhost:3001/api/waitlist?provider_id=${providerId}`);
      const waitlistPatients: WaitlistPatient[] = await waitlistResponse.json();

      if (waitlistPatients.length === 0) {
        alert(`No patients on waitlist for this provider`);
        setWaitlistAnalysisModalOpen(false);
        return;
      }

      // Get provider info
      const providerResponse = await fetch('http://localhost:3001/api/providers');
      const providers = await providerResponse.json();
      const provider = providers.find((p: any) => p.provider_id === providerId);

      if (!provider) {
        alert('Provider not found');
        setWaitlistAnalysisModalOpen(false);
        return;
      }

      // Call LLM to analyze general waitlist for this provider
      const analysis = await analyzeGeneralWaitlist(
        waitlistPatients,
        provider.name,
        provider.specialty,
        selectedModel
      );

      setWaitlistAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze waitlist:', error);
      alert('Failed to analyze waitlist. Please try again.');
      setWaitlistAnalysisModalOpen(false);
    } finally {
      setAnalyzingWaitlist(false);
    }
  };

  const handleGenerateDailySummary = async () => {
    setGeneratingSummary(true);
    setDailySummaryModalOpen(true);

    try {
      // Get provider info for specialty
      const providerResponse = await fetch('http://localhost:3001/api/providers');
      const providers = await providerResponse.json();
      const provider = providers.find((p: any) => p.provider_id === providerId);

      const summary = await generateDailySummary(
        appointments,
        kpis.waitlist_count,
        providerName,
        date,
        providerId,
        provider?.specialty,
        weather?.condition,
        weather?.temperature_f,
        selectedModel
      );
      setDailySummary(summary);
    } catch (error) {
      console.error('Failed to generate daily summary:', error);
      alert('Failed to generate daily summary. Please try again.');
      setDailySummaryModalOpen(false);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateRiskScores = async () => {
    // Process all appointments (regenerate if already exists)
    const appointmentsToProcess = appointments;

    if (appointmentsToProcess.length === 0) {
      alert('No appointments to process!');
      return;
    }

    setGeneratingRisk(true);
    setRiskProgress({ current: 0, total: appointmentsToProcess.length });

    try {
      // Process all appointments in parallel using Promise.all
      const results = await Promise.all(
        appointmentsToProcess.map(async (appointment) => {
          try {
            // 1. Fetch patient with history
            const patientData = await getPatientWithHistory(appointment.patient_id);

            // 2. Generate risk score (includes weather fetch internally)
            const riskAssessment = await generateRiskScore(
              {
                patient_id: patientData.patient_id,
                name: patientData.name,
                age: patientData.age,
                distance_miles: patientData.distance_miles,
                zip_code: patientData.zip_code,
                phone: patientData.phone,
                email: patientData.email,
                commute_type: patientData.commute_type,
                preferred_virtual: patientData.preferred_virtual
              },
              {
                appointment_id: appointment.appointment_id,
                patient_id: appointment.patient_id,
                provider_id: appointment.provider_id,
                scheduled_time: appointment.scheduled_time,
                booked_at: appointment.booked_at,
                appointment_type: appointment.appointment_type,
                chief_complaint: appointment.chief_complaint,
                status: 'scheduled'
              },
              patientData.history,
              selectedModel
            );

            // 3. Fetch weather for virtual eligibility assessment
            const appointmentDate = appointment.scheduled_time.split('T')[0];
            let weatherData = null;
            try {
              const weatherResponse = await fetch(
                `http://localhost:3001/api/weather?date=${appointmentDate}&zip_code=${patientData.zip_code}`
              );
              weatherData = await weatherResponse.json();
            } catch (error) {
              console.warn('Failed to fetch weather for virtual eligibility:', error);
            }

            // 4. Assess virtual eligibility (with patient context and weather)
            const virtualEligibility = await assessVirtualEligibility(
              {
                appointment_id: appointment.appointment_id,
                patient_id: appointment.patient_id,
                provider_id: appointment.provider_id,
                scheduled_time: appointment.scheduled_time,
                appointment_type: appointment.appointment_type,
                chief_complaint: appointment.chief_complaint,
                status: 'scheduled'
              },
              appointment.chief_complaint,
              {
                distance_miles: patientData.distance_miles,
                commute_type: patientData.commute_type,
                preferred_virtual: patientData.preferred_virtual,
                zip_code: patientData.zip_code
              },
              weatherData,
              selectedModel
            );

            // 4. Save to database
            console.log('💾 Saving risk assessment for appointment:', appointment.appointment_id, {
              risk_score: riskAssessment.risk_score,
              risk_badge: riskAssessment.risk_badge,
              primary_risk_factor: riskAssessment.primary_risk_factor,
              secondary_risk_factor: riskAssessment.secondary_risk_factor,
              contributing_factors: riskAssessment.contributing_factors,
              predicted_show_probability: riskAssessment.predicted_show_probability,
              weather_condition: riskAssessment.weather_condition,
              weather_impact_score: riskAssessment.weather_impact_score,
            });

            await saveRiskAssessment({
              assessment_id: `ASSESS_${appointment.appointment_id}`,
              appointment_id: appointment.appointment_id,
              risk_score: riskAssessment.risk_score,
              risk_badge: riskAssessment.risk_badge,
              primary_risk_factor: riskAssessment.primary_risk_factor,
              secondary_risk_factor: riskAssessment.secondary_risk_factor,
              contributing_factors: riskAssessment.contributing_factors,
              predicted_show_probability: riskAssessment.predicted_show_probability,
              weather_condition: riskAssessment.weather_condition,
              weather_impact_score: riskAssessment.weather_impact_score,
              virtual_eligible: virtualEligibility.virtual_eligible,
              virtual_reason: virtualEligibility.virtual_reason,
              virtual_confidence: virtualEligibility.confidence,
              model_version: selectedModel
            });

            // Update progress atomically
            setRiskProgress(prev => ({ ...prev, current: prev.current + 1 }));

            return { success: true, appointment_id: appointment.appointment_id };
          } catch (error) {
            console.error(`❌ Error processing appointment ${appointment.appointment_id}:`, error);
            return { success: false, appointment_id: appointment.appointment_id, error };
          }
        })
      );

      // Final refresh after all are done
      const apptResponse = await fetch(
        `http://localhost:3001/api/appointments?date=${date}&provider_id=${providerId}`
      );
      const apptData = await apptResponse.json();
      console.log('📊 Refreshed appointments, sample data:', apptData[0]);
      setAppointments(apptData);

      // Final refresh of KPIs
      const kpiResponse = await fetch(
        `http://localhost:3001/api/kpis?date=${date}&provider_id=${providerId}`
      );
      const kpiData = await kpiResponse.json();
      setKPIs(kpiData);

      console.log('✅ All risk scores generated:', results);
    } catch (error) {
      console.error('Failed to generate risk scores:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate risk scores at ${riskProgress.current}/${riskProgress.total}. Error: ${errorMessage}`);
    } finally {
      setGeneratingRisk(false);
      setRiskProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  const providerName = appointments[0]?.provider_name || 'Provider';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Commure Pulse</h1>
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

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {providerName} - {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            {weather && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {getWeatherIcon(weather.condition)}
                <span>{weather.condition}, {weather.temperature_f}°F</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in">
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Appointments</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpis.total_appointments}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">High Risk</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpis.high_risk_patients}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {kpis.total_appointments > 0 ? Math.round((kpis.high_risk_patients / kpis.total_appointments) * 100) : 0}% of total
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Virtual Eligible</span>
              <Users className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {appointments.filter(apt => apt.virtual_eligible === 1).length}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {appointments.length > 0 ? Math.round((appointments.filter(apt => apt.virtual_eligible === 1).length / appointments.length) * 100) : 0}% of total
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">New Patient Waitlist</span>
              <UserPlus className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpis.waitlist_count}</div>
            <button
              onClick={() => setWaitlistModalOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-700 mt-0.5 font-medium"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Model Selection and Action Buttons */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="model-select" className="text-sm font-medium text-gray-700">
              AI Model:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as 'gpt-5-nano' | 'gpt-4.1')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="gpt-5-nano">gpt-5-nano</option>
              <option value="gpt-4.1">gpt-4.1</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateRiskScores}
            disabled={generatingRisk}
            className="bg-gradient-to-r from-black via-gray-800 to-gray-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:from-gray-900 hover:via-gray-700 hover:to-gray-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {generatingRisk ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Risk Index... ({riskProgress.current}/{riskProgress.total})
              </>
            ) : (
              'Risk Score Agent'
            )}
          </button>

          <button
            onClick={handleGenerateCampaigns}
            disabled={generatingCampaigns}
            className="bg-gradient-to-r from-black via-gray-800 to-gray-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:from-gray-900 hover:via-gray-700 hover:to-gray-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {generatingCampaigns ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Campaigns...
              </>
            ) : (
              'Outreach Agent'
            )}
          </button>

          <button
            onClick={handleGeneralWaitlistAnalysis}
            disabled={analyzingWaitlist}
            className="bg-gradient-to-r from-black via-gray-800 to-gray-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:from-gray-900 hover:via-gray-700 hover:to-gray-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {analyzingWaitlist ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Waitlist Agent'
            )}
          </button>

          <button
            onClick={handleGenerateDailySummary}
            disabled={generatingSummary}
            className="bg-gradient-to-r from-black via-gray-800 to-gray-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:from-gray-900 hover:via-gray-700 hover:to-gray-500 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {generatingSummary ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Summary Agent'
            )}
          </button>
          </div>
        </div>

        {generatingRisk && (
          <div className="mb-2 text-sm text-gray-600 text-right">
            Processing appointment {riskProgress.current} of {riskProgress.total}. This may take 3-5 seconds per appointment.
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-[12%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="w-[16%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="w-[17%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="w-[8%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="w-[15%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="w-[10%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Virtual
                  </th>
                  <th className="w-[12%] px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No appointments found for this date and provider
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.appointment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm whitespace-nowrap">{apt.patient_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {apt.appointment_type}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{apt.chief_complaint}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {formatDateTime(apt.scheduled_time)}
                      </td>
                      <td className="px-4 py-3">
                        {apt.risk_badge ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(apt.risk_badge)}`}>
                              {apt.risk_badge} ({apt.risk_score})
                            </span>
                            <div className="relative group">
                              <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              {/* Tooltip */}
                              <div className="fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden group-hover:block z-[9999] w-80 pointer-events-none">
                                <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-left pointer-events-auto">
                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Risk Score</div>
                                      <div className="text-sm text-gray-900">{apt.risk_score}/100</div>
                                    </div>
                                    {apt.predicted_show_probability !== null && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Confidence</div>
                                        <div className="text-sm text-gray-900">{Math.round(apt.predicted_show_probability * 100)}%</div>
                                      </div>
                                    )}
                                    {apt.primary_risk_factor && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Primary Factor</div>
                                        <div className="text-sm text-gray-900">{apt.primary_risk_factor}</div>
                                      </div>
                                    )}
                                    {apt.secondary_risk_factor && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Secondary Factor</div>
                                        <div className="text-sm text-gray-900">{apt.secondary_risk_factor}</div>
                                      </div>
                                    )}
                                    {apt.weather_condition && (
                                      <div>
                                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Weather Impact</div>
                                        <div className="text-sm text-gray-900">
                                          {apt.weather_condition} (+{apt.weather_impact_score || 0} points)
                                        </div>
                                      </div>
                                    )}
                                    {apt.contributing_factors && (() => {
                                      try {
                                        const factors = JSON.parse(apt.contributing_factors);
                                        if (Array.isArray(factors) && factors.length > 0) {
                                          return (
                                            <div>
                                              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Contributing Factors</div>
                                              <div className="text-sm text-gray-900">
                                                <ul className="list-disc list-inside space-y-1 mt-1">
                                                  {factors.map((factor: string, idx: number) => (
                                                    <li key={idx}>{factor}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            </div>
                                          );
                                        }
                                      } catch (e) {
                                        console.error('Error parsing contributing_factors:', e, apt.contributing_factors);
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {apt.virtual_eligible !== null ? (
                          <span className={`text-sm font-medium ${apt.virtual_eligible ? 'text-green-600' : 'text-gray-600'}`}>
                            {apt.virtual_eligible ? 'Yes' : 'No'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/appointment/${apt.appointment_id}`)}
                          className="bg-black text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-gray-800 transition-all flex items-center gap-1"
                          title="View patient details"
                        >
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {appointments.length > 0 && (
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        providerId={providerId}
      />

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={campaignModalOpen}
        onClose={() => {
          setCampaignModalOpen(false);
          setBulkCampaigns(null);
        }}
        campaigns={bulkCampaigns}
        loading={generatingCampaigns}
      />

      {/* Waitlist Analysis Modal */}
      <WaitlistAnalysisModal
        isOpen={waitlistAnalysisModalOpen}
        onClose={() => {
          setWaitlistAnalysisModalOpen(false);
          setWaitlistAnalysis(null);
        }}
        analysis={waitlistAnalysis}
        loading={analyzingWaitlist}
      />

      {/* Daily Summary Modal */}
      <DailySummaryModal
        isOpen={dailySummaryModalOpen}
        onClose={() => {
          setDailySummaryModalOpen(false);
          setDailySummary(null);
        }}
        summary={dailySummary}
        loading={generatingSummary}
        providerName={providerName}
        date={date}
      />
    </div>
  );
}
