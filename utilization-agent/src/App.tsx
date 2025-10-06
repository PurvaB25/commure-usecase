import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { HelpPage } from './pages/HelpPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/appointment/:appointmentId" element={<PatientDetailPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
