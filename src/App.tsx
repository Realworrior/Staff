import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { Schedule } from './pages/Schedule';
import { Leave } from './pages/Leave';
import { Payroll } from './pages/Payroll';
import { HR } from './pages/HR';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { RotaGenerator } from './pages/RotaGenerator';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Chat } from './pages/Chat';
import { AttendanceProvider } from './context/AttendanceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KnowledgeProvider } from './context/KnowledgeContext';
import { ThemeProvider } from './context/ThemeContext';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { UserManagement } from './pages/Users';
import { AccountLogs } from './pages/AccountLogs';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>;
  }

  if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <KnowledgeProvider>
            <AttendanceProvider>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="schedule" element={<Schedule />} />
                  <Route path="rota" element={<RotaGenerator />} />
                  <Route path="kb" element={<KnowledgeBase />} />
                  <Route path="leave" element={<Leave />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="hr" element={<HR />} />
                  <Route path="hr/:id" element={<EmployeeProfile />} />
                  <Route path="users" element={
                    <AdminRoute>
                      <UserManagement />
                    </AdminRoute>
                  } />
                  <Route path="account-logs" element={<AccountLogs />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="settings" element={<Settings />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </AttendanceProvider>
          </KnowledgeProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
