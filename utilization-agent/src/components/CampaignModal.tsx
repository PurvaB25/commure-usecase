import { useState } from 'react';
import { X, Mail, MessageSquare, Loader2, Monitor } from 'lucide-react';
import type { BulkCampaignResult, CategoryCampaign } from '../types/schema';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: BulkCampaignResult | null;
  loading: boolean;
}

export function CampaignModal({ isOpen, onClose, campaigns, loading }: CampaignModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('low');

  if (!isOpen) return null;

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'low':
        return 'Low Risk';
      case 'medium':
        return 'Medium Risk';
      case 'virtual':
        return 'Virtual Candidate';
      case 'new_patient':
        return 'New Patient';
      case 'high_risk_virtual':
        return 'High Risk + Virtual';
      case 'high_risk_non_virtual':
        return 'High Risk + Non Virtual';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'virtual':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'new_patient':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'high_risk_virtual':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high_risk_non_virtual':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedCampaign = campaigns?.campaigns.find(c => c.category === selectedCategory);

  // Helper function to parse timing and calculate example dates
  const getScheduleExamples = (campaign: CategoryCampaign) => {
    // Use October 31st, 2024 as example appointment date (month is 0-indexed)
    const appointmentDate = new Date(2024, 9, 31);

    return campaign.touchpoints.map((touchpoint) => {
      // Parse the timing string (e.g., "1 day before", "3 days before", "Immediate notification (same day)")
      const match = touchpoint.timing.match(/(\d+)\s+day/i);
      const daysBeforeString = touchpoint.timing;

      // Check if it's an immediate notification
      if (touchpoint.timing.toLowerCase().includes('immediate') || touchpoint.timing.toLowerCase().includes('same day')) {
        // For new patient immediate notifications, use 7 days before
        const sendDate = new Date(appointmentDate);
        sendDate.setDate(sendDate.getDate() - 7);

        const day = sendDate.getDate();
        const daySuffix = (day: number) => {
          if (day > 3 && day < 21) return 'th';
          switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
          }
        };

        const monthName = sendDate.toLocaleString('en-US', { month: 'long' });
        const formattedDate = `${day}${daySuffix(day)} ${monthName}`;

        return {
          timing: '7 days before appointment',
          date: formattedDate
        };
      }

      if (match) {
        const daysBefore = parseInt(match[1]);
        const sendDate = new Date(appointmentDate);
        sendDate.setDate(sendDate.getDate() - daysBefore);

        // Format date as "30th October"
        const day = sendDate.getDate();
        const daySuffix = (day: number) => {
          if (day > 3 && day < 21) return 'th';
          switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
          }
        };

        const monthName = sendDate.toLocaleString('en-US', { month: 'long' });
        const formattedDate = `${day}${daySuffix(day)} ${monthName}`;

        return {
          timing: daysBeforeString,
          date: formattedDate
        };
      }

      return {
        timing: daysBeforeString,
        date: ''
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-black text-white">
          <div>
            <h2 className="text-xl font-semibold">Outreach Campaigns by Risk Category</h2>
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
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar - Category Selection */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Categories
            </h3>
            <div className="space-y-2">
              {campaigns?.campaigns.map((campaign) => (
                <button
                  key={campaign.category}
                  onClick={() => setSelectedCategory(campaign.category)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === campaign.category
                      ? 'bg-white shadow-sm border border-gray-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(campaign.category)}`}>
                    {getCategoryLabel(campaign.category)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {campaign.touchpoints.length} {campaign.touchpoints.length === 1 ? 'touch' : 'touches'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content - Campaign Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
                <span className="ml-3 text-gray-600">Generating campaigns...</span>
              </div>
            ) : !campaigns ? (
              <div className="text-center py-12 text-gray-500">
                No campaigns generated yet
              </div>
            ) : selectedCampaign ? (
              <div className="space-y-6">
                {/* Category Header */}
                <div>
                  <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium border ${getCategoryColor(selectedCampaign.category)}`}>
                    {getCategoryLabel(selectedCampaign.category)}
                  </div>

                  {/* Schedule Example */}
                  <div className="mt-3 bg-black border border-gray-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-white mb-2">
                      For 31st October Appointment:
                    </p>
                    <div className="space-y-1">
                      {getScheduleExamples(selectedCampaign).map((schedule, idx) => (
                        <p key={idx} className="text-sm text-gray-300">
                          • {schedule.timing} - {schedule.date}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Touchpoints */}
                {selectedCampaign.touchpoints.map((touchpoint, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Touchpoint Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-black rounded-full text-white font-semibold text-xs">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{touchpoint.timing}</span>
                      </div>
                    </div>

                    {/* SMS, Email, and EHR Messages */}
                    <div className="grid grid-cols-3 divide-x divide-gray-200">
                      {/* SMS */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-700">SMS</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {touchpoint.messages.sms}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            {touchpoint.messages.sms.length} characters
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-700">Email</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-900 mb-2">
                            Subject: {touchpoint.messages.email.subject}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">
                            {touchpoint.messages.email.body}
                          </div>
                        </div>
                      </div>

                      {/* EHR Notification */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Monitor className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-gray-700">EHR Portal</span>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {touchpoint.messages.ehr_notification}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            {touchpoint.messages.ehr_notification.length} characters
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                className="px-6 py-2 text-white bg-black hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Schedule Campaign
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
