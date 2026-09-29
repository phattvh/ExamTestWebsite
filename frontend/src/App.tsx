import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CameraTest from './components/CameraTest';

// Speed: code-split the super admin app so the main bundle stays small.
const ExamAdminApp = lazy(() => import('./apps/exam-admin/ExamAdminApp'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/camera-test" element={
            <PrivateRoute>
              <CameraTest />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <Suspense fallback={<div style={{ padding: 24 }}>Đang tải VJP Pro…</div>}>
                <ExamAdminApp />
              </Suspense>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
