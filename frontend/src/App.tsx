import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';
import AdminRoute from './components/AdminRoute';
import StaffRoute from './components/StaffRoute';

// Lazy loaded page components for optimal performance and code splitting
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ExamList = lazy(() => import('./pages/ExamList'));
const StudentResults = lazy(() => import('./pages/StudentResults'));
const ExamRoom = lazy(() => import('./pages/ExamRoom'));
const ResultSummary = lazy(() => import('./pages/ResultSummary'));
const CameraTest = lazy(() => import('./components/CameraTest'));
const ProctorDashboard = lazy(() => import('./pages/ProctorDashboard'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminQuestions = lazy(() => import('./pages/AdminQuestions'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminExams = lazy(() => import('./pages/AdminExams'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const ManualGrading = lazy(() => import('./pages/ManualGrading'));
const AdminViolations = lazy(() => import('./pages/AdminViolations'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const StudentLayout = lazy(() => import('./components/StudentLayout'));

import { ExamProvider } from './context/ExamContext';

const PageLoader = () => (
  <Box sx={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', bgcolor: '#F8FAFC' }}>
    <CircularProgress size={40} thickness={4} sx={{ color: '#2563EB' }} />
  </Box>
);

// Speed: code-split the super admin app so the main bundle stays small.
const ExamAdminApp = lazy(() => import('./apps/exam-admin/ExamAdminApp'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/change-password" element={
            <RoleRoute allowedRoles={['student', 'teacher', 'admin']}>
              <StudentLayout>
                <ChangePassword />
              </StudentLayout>
            </RoleRoute>
          } />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <RoleRoute allowedRoles={['student', 'teacher', 'admin']}>
              <StudentLayout>
                <Dashboard />
              </StudentLayout>
            </RoleRoute>
          } />

          {/* Student Routes */}
          <Route path="/student/exams" element={
            <RoleRoute allowedRoles={['student', 'admin', 'teacher']}>
              <StudentLayout>
                <ExamList />
              </StudentLayout>
            </RoleRoute>
          } />
<<<<<<< HEAD
          <Route path="/student/results" element={
            <RoleRoute allowedRoles={['student', 'admin']}>
              <StudentLayout>
                <StudentResults />
              </StudentLayout>
            </RoleRoute>
          } />
          <Route path="/student/exam/:id" element={
            <RoleRoute allowedRoles={['student', 'admin']}>
              <ExamProvider>
                <ExamRoom />
              </ExamProvider>
            </RoleRoute>
          } />
          <Route path="/student/result/:attemptId" element={
            <RoleRoute allowedRoles={['student', 'admin']}>
              <StudentLayout>
                <ResultSummary />
              </StudentLayout>
            </RoleRoute>
          } />
          <Route path="/student/camera-test" element={
            <RoleRoute allowedRoles={['student', 'admin']}>
              <StudentLayout>
                <CameraTest />
              </StudentLayout>
            </RoleRoute>
          } />

          {/* Teacher Routes — dùng lại component quản lý của Admin vì backend đã cấp quyền
              exam:create/update/delete, question:create/update/delete cho teacher.
              Trước đây route này trỏ vào <ExamList/> (giao diện "vào thi" của học sinh) —
              không có chức năng tạo/sửa đề nào cho giáo viên cả. */}
          <Route path="/teacher/exams" element={
            <StaffRoute>
              <AdminLayout>
                <AdminExams />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/teacher/questions" element={
            <StaffRoute>
              <AdminLayout>
                <AdminQuestions />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/teacher/grading" element={
            <StaffRoute>
              <AdminLayout>
                <ManualGrading />
              </AdminLayout>
            </StaffRoute>
          } />

          {/* Proctor Route */}
          <Route path="/proctor/exam/:examId" element={
            <RoleRoute allowedRoles={['teacher', 'admin']}>
              <ProctorDashboard />
            </RoleRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/questions" element={
            <StaffRoute>
              <AdminLayout>
                <AdminQuestions />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/admin/categories" element={
            <StaffRoute>
              <AdminLayout>
                <AdminCategories />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/admin/exams" element={
            <StaffRoute>
              <AdminLayout>
                <AdminExams />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/admin/manual-grading" element={
            <StaffRoute>
              <AdminLayout>
                <ManualGrading />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/admin/reports" element={
            <StaffRoute>
              <AdminLayout>
                <AdminReports />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/admin/violations" element={
            <StaffRoute>
              <AdminLayout>
                <AdminViolations />
              </AdminLayout>
            </StaffRoute>
          } />
          <Route path="/teacher/violations" element={
            <StaffRoute>
              <AdminLayout>
                <AdminViolations />
              </AdminLayout>
            </StaffRoute>
          } />
          
          <Route path="/admin/vjp-pro" element={
            <StaffRoute>
              <ExamAdminApp />
            </StaffRoute>
          } />
          <Route path="/admin" element={
            <StaffRoute>
              <ExamAdminApp />
            </StaffRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
