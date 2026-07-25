import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LandingPage } from '@/pages/LandingPage';
import { WaitingPage } from '@/pages/WaitingPage';
import { StudentView } from '@/pages/StudentView';
import { TeacherView } from '@/pages/TeacherView';
import { Header } from '@/components/Header';
import { ChatPopup } from '@/components/ChatPopup';
import { PromptCards } from '@/components/PromptCards';

function AppContent() {
  const { firebaseUser, userData, loading } = useAuth();
  const [activeRole, setActiveRole] = useState<'student' | 'teacher'>('student');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: 'var(--primary)', display: 'block', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>جاري تحميل البوابة السحابية...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !userData) return <LandingPage />;
  if (!userData.approved) return <WaitingPage />;

  const handleRoleSwitch = (role: 'student' | 'teacher') => {
    setActiveRole(role);
  };

  // Default active role: if teacher just logged in, keep student view unless teacher switches
  const effectiveRole = userData.role === 'teacher' ? activeRole : 'student';
  const chatCohort = userData.role === 'teacher' ? 'فوج الذكور' : userData.cohort;

  return (
    <div id="appContainer">
      <Header activeRole={effectiveRole} onRoleSwitch={handleRoleSwitch} />
      <main className="main-content">
        {effectiveRole === 'student' ? <StudentView /> : <TeacherView />}
        <ChatPopup
          defaultCohort={chatCohort}
          showRoomSelector={userData.role === 'teacher'}
        />
        <PromptCards />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
