import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, HelpCircle } from 'lucide-react';

interface Provider {
  provider_id: string;
  name: string;
  specialty: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedDate, setSelectedDate] = useState('2025-10-27');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('http://localhost:3001/api/providers');
        const data = await response.json();
        setProviders(data);
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    }
    fetchProviders();
  }, []);

  const handleSearch = () => {
    if (!selectedDate || !selectedProvider) {
      alert('Please select both date and provider');
      return;
    }

    setLoading(true);
    navigate(`/results?date=${selectedDate}&provider_id=${selectedProvider}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-black">
                Commure Pulse
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Admin</span>
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-sm font-medium text-white shadow-md">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[calc(100vh-4rem)] -mt-16">
        <div className="w-full">
          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-5xl font-bold text-black mb-3 pb-1">
              Schedule Intelligence
            </h2>
            <p className="text-gray-600 text-lg">Turning Missed Appointments into Operational Opportunity using AI</p>
          </div>

          {/* Search Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-10 shadow-xl shadow-blue-100/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Date Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-black" />
                  </div>
                  Appointment Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm hover:border-blue-400 transition-colors"
                >
                  <option value="">Select date...</option>
                  <option value="2025-10-27">Monday, October 27, 2025</option>
                  <option value="2025-10-28">Tuesday, October 28, 2025</option>
                  <option value="2025-10-29">Wednesday, October 29, 2025</option>
                  <option value="2025-10-30">Thursday, October 30, 2025</option>
                  <option value="2025-10-31">Friday, October 31, 2025</option>
                </select>
              </div>

              {/* Provider Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <Search className="w-4 h-4 text-black" />
                  </div>
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm hover:border-blue-400 transition-colors"
                >
                  <option value="">Select provider...</option>
                  {providers.map((provider) => (
                    <option key={provider.provider_id} value={provider.provider_id}>
                      {provider.name} - {provider.specialty}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading || !selectedDate || !selectedProvider}
              className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40 hover:-translate-y-0.5"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Loading...' : 'Search Appointments'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
