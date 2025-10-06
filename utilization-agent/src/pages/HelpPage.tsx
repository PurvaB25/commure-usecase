import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Activity, Video, MessageSquare, Users, ListChecks, FileText, Network, ArrowDown } from 'lucide-react';

// Workflow Visualization Component
interface WorkflowNode {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  outputData: string;
}

function WorkflowVisualization() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const workflowNodes: WorkflowNode[] = [
    {
      id: 'risk-scorer',
      name: 'Risk Scorer',
      icon: <Activity className="w-5 h-5" />,
      description: 'Analyzes each appointment and assigns a risk score (0-100) predicting likelihood of no-show',
      outputData: 'Risk scores, risk levels (Low/Medium/High), confidence ratings'
    },
    {
      id: 'virtual-eligibility',
      name: 'Virtual Eligibility',
      icon: <Video className="w-5 h-5" />,
      description: 'Identifies which appointments can be converted to virtual visits to reduce barriers',
      outputData: 'Virtual eligibility status, clinical appropriateness scores'
    },
    {
      id: 'waitlist-analyzer',
      name: 'Waitlist Analyzer',
      icon: <ListChecks className="w-5 h-5" />,
      description: 'Prioritizes waitlist patients who could fill predicted gaps from high-risk appointments',
      outputData: 'Ranked waitlist with priority scores, urgency levels'
    },
    {
      id: 'outreach-campaign',
      name: 'Outreach Campaign',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Creates personalized reminder messages based on risk level and virtual eligibility',
      outputData: 'Customized SMS/email/portal messages with strategic timing'
    },
    {
      id: 'daily-summary',
      name: 'Daily Summary',
      icon: <FileText className="w-5 h-5" />,
      description: 'Compiles all insights into a comprehensive day-ahead briefing for the doctor',
      outputData: 'Executive summary, key metrics, actionable recommendations'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        {workflowNodes.map((node, index) => (
          <div key={node.id} className="relative">
            {/* Node Card */}
            <div
              className="relative z-10 bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-4 mb-2 transition-all duration-300 hover:shadow-xl hover:border-gray-500 cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="flex items-start gap-3">
                {/* Step Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0 p-2 bg-gray-800 rounded-lg text-white">
                  {node.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white mb-1">{node.name}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed mb-2">{node.description}</p>

                  {/* Output Data - shown on hover */}
                  <div className={`overflow-hidden transition-all duration-300 ${hoveredNode === node.id ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Outputs</div>
                      <div className="text-[10px] text-gray-200">{node.outputData}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connector Arrow */}
            {index < workflowNodes.length - 1 && (
              <div className="flex justify-center my-1 relative z-0">
                <div className="flex flex-col items-center">
                  <ArrowDown className="w-5 h-5 text-gray-600 animate-pulse" />
                  <div className="w-0.5 h-2 bg-gradient-to-b from-gray-600 to-transparent"></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// PieChart Component
interface PieChartProps {
  factors: WeightedFactor[];
  size?: number;
}

function PieChart({ factors, size = 200 }: PieChartProps) {
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  const pieRadius = radius * 0.7;

  let cumulativePercent = 0;

  const slices = factors.map((factor) => {
    const startAngle = cumulativePercent * 360;
    const endAngle = (cumulativePercent + factor.weight / 100) * 360;
    cumulativePercent += factor.weight / 100;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + pieRadius * Math.cos(startRad);
    const y1 = centerY + pieRadius * Math.sin(startRad);
    const x2 = centerX + pieRadius * Math.cos(endRad);
    const y2 = centerY + pieRadius * Math.sin(endRad);

    const largeArc = factor.weight > 50 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return { ...factor, pathData };
  });

  return (
    <div className="flex items-start gap-3">
      <svg width={size} height={size} className="flex-shrink-0">
        {slices.map((slice, index) => (
          <path
            key={index}
            d={slice.pathData}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex-1 space-y-1.5">
        {factors.map((factor, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: factor.color }}
            />
            <span className="text-xs text-gray-700">
              <span className="font-semibold">{factor.weight}%</span> {factor.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type AgentId = 'workflow-overview' | 'risk-scorer' | 'virtual-eligibility' | 'outreach-campaign' | 'waitlist-analyzer' | 'daily-summary';

interface ExampleData {
  scenario: string;
  inputData: { label: string; value: string }[];
  result: { label: string; value: string }[];
  actionTaken: string;
}

interface WeightedFactor {
  label: string;
  weight: number;
  color: string;
}

interface AgentInfo {
  id: AgentId;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  purpose: string;
  howItWorks: string[];
  inputs: string[];
  outputs: string[];
  example: ExampleData;
  weights?: WeightedFactor[];
  isWorkflowOverview?: boolean;
}

const agents: AgentInfo[] = [
  {
    id: 'workflow-overview',
    name: 'Agent Workflow',
    icon: <Network className="w-6 h-6" />,
    tagline: 'How the 5 AI agents work together',
    purpose: 'This overview shows how our 5 AI agents connect and work together in sequence to optimize your clinic operations. Each agent builds on the outputs of the previous ones, creating an intelligent workflow from risk prediction to daily planning.',
    howItWorks: [
      'The workflow starts with Risk Scoring every appointment to predict no-shows',
      'Virtual Eligibility then identifies opportunities to reduce barriers',
      'Waitlist Analyzer prepares backup options for predicted gaps',
      'Outreach Campaign creates personalized reminders based on risk and virtual status',
      'Daily Summary compiles everything into actionable insights for the doctor'
    ],
    inputs: [],
    outputs: [],
    example: {
      scenario: '',
      inputData: [],
      result: [],
      actionTaken: ''
    },
    isWorkflowOverview: true
  },
  {
    id: 'risk-scorer',
    name: 'Risk Scorer Agent',
    icon: <Activity className="w-6 h-6" />,
    tagline: 'Predicts which patients might miss their appointments',
    purpose: 'This agent helps you identify patients who are at risk of not showing up for their scheduled appointments. By predicting no-shows ahead of time, you can take proactive steps to ensure patients attend their visits.',
    howItWorks: [
      'Analyzes the patient\'s appointment history to see how many times they\'ve shown up or missed appointments in the past',
      'Considers practical factors like weather conditions and how far the patient needs to travel',
      'Looks at how far in advance the appointment was booked (last-minute bookings are riskier)',
      'Combines all these factors to calculate a risk score from 0 to 100',
      'Assigns a simple label: Low Risk (patient will likely show up), Medium Risk (uncertain), or High Risk (patient might not show up)'
    ],
    weights: [
      { label: 'Historical no-show rate', weight: 40, color: '#000000' },
      { label: 'Weather + commute', weight: 20, color: '#404040' },
      { label: 'Booking lead time', weight: 15, color: '#606060' },
      { label: 'Distance from clinic', weight: 10, color: '#808080' },
      { label: 'Recent reschedules', weight: 10, color: '#A0A0A0' },
      { label: 'Appointment type', weight: 5, color: '#C0C0C0' }
    ],
    inputs: [
      'Patient\'s name and appointment history',
      'Appointment details (type, date, time)',
      'Distance from clinic and how they commute (car, bike, public transport)',
      'Weather forecast for the appointment day',
      'How far in advance they booked'
    ],
    outputs: [
      'Risk Score (0-100): Higher numbers mean higher risk of no-show',
      'Risk Level: Low, Medium, or High',
      'Main Reasons: What factors are making this patient risky',
      'Confidence Level: How certain the system is about this prediction',
      'Weather Impact: How much weather is affecting the risk'
    ],
    example: {
      scenario: 'Patient Sarah Johnson has an upcoming appointment',
      inputData: [
        { label: 'No-Show History', value: '75% (missed 9 out of 12 past appointments)' },
        { label: 'Distance', value: '20 miles from clinic' },
        { label: 'Commute Method', value: 'Public transport' },
        { label: 'Weather Forecast', value: 'Heavy rain expected' },
        { label: 'Appointment Type', value: 'Follow-up visit' }
      ],
      result: [
        { label: 'Risk Score', value: '85/100' },
        { label: 'Risk Level', value: 'HIGH RISK' },
        { label: 'Main Factor', value: 'Poor attendance history (75% no-show rate)' },
        { label: 'Secondary Factor', value: 'Weather + public transport challenges' }
      ],
      actionTaken: 'Staff should call Sarah directly 2 days before appointment AND send reminder SMS on appointment day. Consider offering virtual visit option.'
    }
  },
  {
    id: 'virtual-eligibility',
    name: 'Virtual Eligibility Agent',
    icon: <Video className="w-6 h-6" />,
    tagline: 'Recommends which appointments can be done online',
    purpose: 'This agent identifies which appointments can be safely conducted as virtual video visits instead of in-person visits. This helps remove barriers for patients and makes healthcare more convenient.',
    howItWorks: [
      'First checks if the appointment type requires a physical examination (like annual physicals or procedures) or can be done virtually (like follow-ups or medication reviews)',
      'Considers the patient\'s preference - do they want a virtual visit?',
      'Looks at practical barriers like distance to the clinic and weather conditions',
      'Evaluates if the patient\'s chief complaint can be addressed without physical examination',
      'Makes a recommendation based on clinical appropriateness and patient convenience'
    ],
    weights: [
      { label: 'Clinical eligibility', weight: 45, color: '#000000' },
      { label: 'Commute & weather', weight: 20, color: '#404040' },
      { label: 'Patient preference', weight: 20, color: '#707070' },
      { label: 'Distance & access', weight: 15, color: '#A0A0A0' }
    ],
    inputs: [
      'Appointment type (follow-up, new patient, annual physical, etc.)',
      'Chief complaint (what the patient needs to discuss)',
      'Patient\'s distance from clinic',
      'Patient\'s preference for virtual or in-person',
      'Weather conditions',
      'Patient\'s commute method'
    ],
    outputs: [
      'Virtual Eligible: Yes or No',
      'Detailed Explanation: Why this visit can or cannot be virtual',
      'Confidence Score: How confident the system is in this recommendation',
      'Key Factors: What influenced the decision (clinical needs, patient preference, weather, etc.)'
    ],
    example: {
      scenario: 'Patient John has a routine blood pressure follow-up appointment',
      inputData: [
        { label: 'Appointment Type', value: 'Follow-up visit' },
        { label: 'Chief Complaint', value: 'Routine hypertension monitoring' },
        { label: 'Distance from Clinic', value: '30 miles' },
        { label: 'Patient Preference', value: 'Prefers virtual visits' },
        { label: 'Weather Forecast', value: 'Rainy conditions expected' },
        { label: 'Condition Status', value: 'Stable chronic condition' }
      ],
      result: [
        { label: 'Virtual Eligible', value: 'YES' },
        { label: 'Confidence Score', value: '95/100' },
        { label: 'Clinical Factor', value: 'Routine hypertension follow-up appropriate for virtual care' },
        { label: 'Practical Factor', value: 'Patient lives far away, weather challenging' },
        { label: 'Patient Factor', value: 'Patient explicitly prefers virtual visits' }
      ],
      actionTaken: 'Offer virtual visit option to patient. Stable chronic condition requiring only medication review can be safely conducted remotely.'
    }
  },
  {
    id: 'outreach-campaign',
    name: 'Outreach Campaign Agent',
    icon: <MessageSquare className="w-6 h-6" />,
    tagline: 'Creates personalized reminder messages for patients',
    purpose: 'This agent automatically generates customized appointment reminders and outreach messages for different types of patients. It helps ensure patients remember their appointments and know what to do if they need to reschedule.',
    howItWorks: [
      'Groups patients into categories based on their risk level and needs (Low Risk, Medium Risk, High Risk, Virtual Candidates, New Patients)',
      'For each category, creates different reminder strategies - some patients get one reminder, others get multiple',
      'Writes friendly, personalized messages in three formats: text message (SMS), email, and patient portal notifications',
      'Considers weather conditions and weaves them naturally into messages when relevant',
      'For high-risk patients, emphasizes virtual options and flexibility to reduce barriers',
      'Timing is strategic: some reminders go out 7 days before, others 3 days before, or 1 day before'
    ],
    inputs: [
      'Appointment date',
      'Provider\'s name',
      'Weather forecast',
      'Patient risk categories',
      'Virtual eligibility status'
    ],
    outputs: [
      'Complete campaign strategy for each patient category',
      'SMS messages (short, under 160 characters)',
      'Email messages (subject line and full message body)',
      'Patient portal notifications',
      'Timing for each message (when to send)',
      'Clear action instructions for patients (reply YES to confirm, call to reschedule, etc.)'
    ],
    example: {
      scenario: 'High-risk patient Sarah eligible for virtual visit needs appointment reminders',
      inputData: [
        { label: 'Patient Category', value: 'High-risk, virtual eligible' },
        { label: 'Appointment Date', value: 'October 31st' },
        { label: 'Provider', value: 'Dr. Smith' },
        { label: 'Weather Forecast', value: 'Rain expected' },
        { label: 'Risk Level', value: 'High (85/100)' }
      ],
      result: [
        { label: 'Campaign Strategy', value: '3 touchpoints (7 days, 3 days, 1 day before)' },
        { label: 'Day 7 Message', value: 'Hi Sarah, your appointment with Dr. Smith is Oct 31. We can switch this to virtual - no travel needed, especially with rain expected. Reply VIRTUAL to switch or CONFIRM for in-person.' },
        { label: 'Day 3 Message', value: 'Reminder: Dr. Smith on Oct 31. Virtual option still available - stay dry and comfortable at home. Reply YES to confirm or call to switch.' },
        { label: 'Day 1 Message', value: 'Tomorrow at 2pm - Dr. Smith. Virtual visit available for convenience. See you online or in-office!' }
      ],
      actionTaken: 'Send 3 progressive reminders emphasizing virtual option and flexibility to reduce no-show risk for high-risk patient.'
    }
  },
  {
    id: 'waitlist-analyzer',
    name: 'Waitlist Analyzer Agent',
    icon: <ListChecks className="w-6 h-6" />,
    tagline: 'Prioritizes who on the waitlist should be scheduled next',
    purpose: 'This agent analyzes your entire new patient waitlist and tells you which patients need to be scheduled most urgently. It helps you make fair, clinically-appropriate decisions about who to schedule first.',
    howItWorks: [
      'Reviews every patient on the waitlist for a specific doctor',
      'Evaluates three main factors for each patient:',
      '  • Clinical urgency: How serious is their medical need? (50% weight)',
      '  • Wait time: How long have they been waiting? (30% weight)',
      '  • Patient preference: How quickly do they need to be seen? (20% weight)',
      'Combines these factors into a priority score from 0-100',
      'Assigns urgency levels: Critical (schedule immediately), High (within 1 week), Medium (within 2-3 weeks), Low (routine)',
      'Ranks all patients from highest to lowest priority',
      'Provides specific action recommendations for each patient'
    ],
    weights: [
      { label: 'Clinical urgency', weight: 50, color: '#000000' },
      { label: 'Wait time', weight: 30, color: '#505050' },
      { label: 'Patient preference', weight: 20, color: '#909090' }
    ],
    inputs: [
      'Complete waitlist of new patients for a doctor',
      'Each patient\'s chief complaint and detailed reason for visit',
      'How long each patient has been waiting',
      'Patient\'s preferred timeframe',
      'Doctor\'s name and specialty'
    ],
    outputs: [
      'Every patient ranked by priority score (highest to lowest)',
      'Priority Score (0-100) for each patient',
      'Urgency Level: Critical, High, Medium, or Low',
      'Clinical Summary: Why this patient is prioritized',
      'Recommended Action: Specific next steps for each patient',
      'Overall waitlist summary',
      'General recommendations for managing the waitlist'
    ],
    example: {
      scenario: 'Analyzing Dr. Smith\'s entire new patient waitlist to prioritize scheduling',
      inputData: [
        { label: 'Total Waitlist', value: '45 new patients waiting' },
        { label: 'Provider', value: 'Dr. Smith (Internal Medicine)' },
        { label: 'Date Range', value: 'Patients waiting 5-65 days' },
        { label: 'Analysis Type', value: 'Clinical urgency + wait time + patient preference' }
      ],
      result: [
        { label: 'Top Priority', value: 'Lisa Chen - 92/100 (CRITICAL)' },
        { label: 'Lisa Details', value: 'Severe depression requiring timely management, waiting 65 days (excessive), needs appointment within 1 week' },
        { label: '2nd Priority', value: 'Robert Williams - 78/100 (HIGH) - Uncontrolled diabetes, waiting 40 days, wants appointment within 2 weeks' },
        { label: '3rd Priority', value: 'Susan Lee - 65/100 (MEDIUM) - Annual physical/preventive care, waiting 20 days, flexible timing' },
        { label: 'Waitlist Summary', value: '3 critical cases need immediate attention, 12 high priority within 1 week' }
      ],
      actionTaken: 'Schedule Lisa Chen immediately (highest priority). Schedule Robert Williams within 1 week. Address all 3 critical cases this week.'
    }
  },
  {
    id: 'daily-summary',
    name: 'Daily Summary Agent',
    icon: <FileText className="w-6 h-6" />,
    tagline: 'Provides the doctor\'s daily briefing and schedule overview',
    purpose: 'This agent creates a comprehensive daily briefing for doctors one day before their clinic. It gives them a quick overview of what to expect, highlights important items, and suggests proactive actions to optimize their day.',
    howItWorks: [
      'Gathers all appointments scheduled for the next day',
      'Calculates key metrics: total appointments, new vs returning patients, risk distribution',
      'Analyzes schedule efficiency and identifies gaps or opportunities',
      'Checks the waitlist for patients who could fill potential openings',
      'Reviews weather forecast and its potential impact',
      'Identifies virtual conversion opportunities',
      'Generates a narrative summary highlighting patterns and notable items',
      'Creates actionable recommendations for the doctor and staff'
    ],
    inputs: [
      'All appointments scheduled for the day',
      'Each patient\'s risk level and details',
      'Waitlist patient count and details',
      'Doctor\'s name and specialty',
      'Weather forecast',
      'Schedule gaps and utilization data'
    ],
    outputs: [
      'Executive Summary: High-level overview of the day (3-4 sentences)',
      'Key Metrics: Total appointments, new patients, risk breakdown, virtual eligible count',
      'Key Insights: 3-5 notable patterns or observations (e.g., "5 high-risk appointments may need proactive outreach")',
      'Schedule Details: Patient-by-patient summary with times and risk levels',
      'Recommendations: 2-4 actionable suggestions (e.g., "Call 3 high-risk patients today", "4 appointments can be converted to virtual")',
      'Waitlist Opportunities: Top priority patients who could fill gaps',
      'Utilization Stats: Hours scheduled vs available, efficiency percentage'
    ],
    example: {
      scenario: 'Daily briefing for Dr. Smith\'s clinic day on Thursday, October 31st',
      inputData: [
        { label: 'Total Appointments', value: '12 scheduled (including 3 new patients)' },
        { label: 'Risk Distribution', value: '4 high-risk, 5 medium-risk, 3 low-risk' },
        { label: 'Weather Forecast', value: 'Rainy weather expected' },
        { label: 'Virtual Eligible', value: '6 appointments suitable for virtual' },
        { label: 'Schedule Gaps', value: '2-hour gap between 2pm-4pm' },
        { label: 'Waitlist', value: '45 patients waiting, top priority: Maria Rodriguez (92/100)' }
      ],
      result: [
        { label: 'Executive Summary', value: '12 appointments scheduled, 4 high-risk for no-show, rainy weather may impact attendance, 6 eligible for virtual conversion' },
        { label: 'Key Insight 1', value: '4 high-risk patients need proactive confirmation calls' },
        { label: 'Key Insight 2', value: '6 appointments suitable for virtual visits given weather conditions' },
        { label: 'Key Insight 3', value: '2-hour gap 2pm-4pm could be filled from waitlist' },
        { label: 'Utilization', value: '75% scheduled - room for 2 more appointments' }
      ],
      actionTaken: 'Contact 4 high-risk patients today. Offer virtual option to 6 eligible patients. Fill 2pm-4pm gap with Maria Rodriguez from waitlist (priority 92/100, waiting 65 days).'
    }
  }
];

export function HelpPage() {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('risk-scorer');

  const currentAgent = agents.find(agent => agent.id === selectedAgent) || agents[0];

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
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-black" />
                <h1 className="text-xl font-semibold text-gray-900">Help & Agent Guide</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Admin</span>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                AD
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-3">
            {/* Workflow Overview Section */}
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Overview
            </h2>
            <nav className="space-y-0.5 mb-4">
              {agents.filter(agent => agent.isWorkflowOverview).map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                    selectedAgent === agent.id
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`${selectedAgent === agent.id ? 'text-white' : 'text-gray-400'}`}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${selectedAgent === agent.id ? 'text-white' : 'text-gray-900'}`}>
                      {agent.name}
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* AI Agents Section */}
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              AI Agents
            </h2>
            <nav className="space-y-0.5">
              {agents.filter(agent => !agent.isWorkflowOverview).map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                    selectedAgent === agent.id
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`${selectedAgent === agent.id ? 'text-white' : 'text-gray-400'}`}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${selectedAgent === agent.id ? 'text-white' : 'text-gray-900'}`}>
                      {agent.name}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="h-full px-6 py-4">
            {/* Agent Header - Compact */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black rounded-lg text-white">
                  {currentAgent.icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{currentAgent.name}</h1>
                  <p className="text-sm text-gray-600">{currentAgent.tagline}</p>
                </div>
              </div>
            </div>

            {/* Content Layout */}
            {currentAgent.isWorkflowOverview ? (
              /* Workflow Overview Layout */
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <WorkflowVisualization />
              </div>
            ) : (
              /* Standard Agent Layout */
              <div className="space-y-4">
                {/* Row 1: Purpose (1) and How It Works (2) - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Purpose Section */}
                  <section className="h-full">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      What Does This Agent Do?
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 h-[calc(100%-2.5rem)] overflow-y-auto">
                      <p className="text-xs text-gray-700 leading-relaxed mb-3">{currentAgent.purpose}</p>
                      {currentAgent.weights && (
                        <div className="pt-3 border-t border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-900 mb-2">Prioritization Weights</h3>
                          <PieChart factors={currentAgent.weights} size={180} />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* How It Works Section */}
                  <section className="h-full">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      How Does It Work?
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 h-[calc(100%-2.5rem)] overflow-y-auto">
                      <ul className="space-y-2">
                        {currentAgent.howItWorks.map((step, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="flex-shrink-0 w-1.5 h-1.5 bg-black rounded-full mt-1.5"></span>
                            <span className="text-xs text-gray-700 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>

                {/* Row 2: Inputs (3) and Outputs (4) - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Inputs Section */}
                  <section className="h-full">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      Inputs
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                      {currentAgent.inputs.map((input, index) => (
                        <div key={index} className="px-3 py-2 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5"></div>
                          <span className="text-xs text-gray-700">{input}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Outputs Section */}
                  <section className="h-full">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      Outputs
                    </h2>
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                      {currentAgent.outputs.map((output, index) => (
                        <div key={index} className="px-3 py-2 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5"></div>
                          <span className="text-xs text-gray-700">{output}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Row 3: Example (5) - Full Width */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                    Real-World Example
                  </h2>
                  <div className="bg-black border border-gray-800 rounded-lg p-3 text-white">
                    {/* Scenario Header */}
                    <div className="mb-2 pb-2 border-b border-gray-800">
                      <p className="text-xs font-semibold text-white">{currentAgent.example.scenario}</p>
                    </div>

                    {/* Two Column Layout for Input/Result */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Input Data */}
                      <div>
                        <h3 className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Input Data</h3>
                        <div className="space-y-1">
                          {currentAgent.example.inputData.map((input, index) => (
                            <div key={index} className="bg-gray-900 rounded px-2 py-1 border border-gray-800">
                              <div className="text-[9px] text-gray-500 uppercase tracking-wide">{input.label}</div>
                              <div className="text-[10px] text-white font-medium">{input.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Result Data */}
                      <div>
                        <h3 className="text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Agent Result</h3>
                        <div className="space-y-1">
                          {currentAgent.example.result.map((output, index) => (
                            <div key={index} className="bg-gray-900 rounded px-2 py-1 border border-gray-800">
                              <div className="text-[9px] text-gray-500 uppercase tracking-wide">{output.label}</div>
                              <div className="text-[10px] text-white font-medium">{output.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
