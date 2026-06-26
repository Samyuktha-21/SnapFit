import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useMeasurementStore } from './store/useMeasurementStore';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import HeightInput from './pages/HeightInput';
import Capture from './pages/Capture';
import Processing from './pages/Processing';
import Results from './pages/Results';
import BrandGrid from './pages/BrandGrid';
import BrandDetail from './pages/BrandDetail';
import Comparison from './pages/Comparison';
import BrandUpload from './pages/BrandUpload';
import StripeCheckout from './pages/StripeCheckout';

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useMeasurementStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-white">
        {/* Navigation Navbar */}
        <Header />

        {/* Page Viewports */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload-brand" element={<BrandUpload />} />
            <Route path="/stripe-checkout" element={<StripeCheckout />} />
            
            {/* Protected Onboarding & Scanning Sequence */}
            <Route 
              path="/height-input" 
              element={
                <ProtectedRoute>
                  <HeightInput />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/capture" 
              element={
                <ProtectedRoute>
                  <Capture />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/processing" 
              element={
                <ProtectedRoute>
                  <Processing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/results" 
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Brand Recommendations */}
            <Route 
              path="/brands" 
              element={
                <ProtectedRoute>
                  <BrandGrid />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/brands/:brandName" 
              element={
                <ProtectedRoute>
                  <BrandDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/comparison" 
              element={
                <ProtectedRoute>
                  <Comparison />
                </ProtectedRoute>
              } 
            />
            
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
