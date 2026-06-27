import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import ScanFit from './pages/ScanFit';
import HeightInput from './pages/HeightInput';
import Capture from './pages/Capture';
import Processing from './pages/Processing';
import Results from './pages/Results';
import BrandGrid from './pages/BrandGrid';
import BrandDetail from './pages/BrandDetail';
import Comparison from './pages/Comparison';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#000000] text-white selection:bg-white/30 selection:text-black">
        {/* Navigation Navbar */}
        <Header />

        {/* Page Viewports */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Our measurement model */}
            <Route path="/scanfit" element={<ScanFit />} />

            {/* Onboarding & Scanning Sequence */}
            <Route path="/height-input" element={<HeightInput />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/results" element={<Results />} />
            
            {/* Brand Recommendations */}
            <Route path="/brands" element={<BrandGrid />} />
            <Route path="/brands/:brandName" element={<BrandDetail />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <Footer />
      </div>
    </Router>
  );
}
