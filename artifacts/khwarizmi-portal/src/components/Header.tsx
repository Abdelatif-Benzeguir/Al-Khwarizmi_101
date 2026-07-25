import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '@/contexts/ToastContext';

interface HeaderProps {
  activeRole: 'student' | 'teacher';
  onRoleSwitch: (role: 'student' | 'teacher') => void;
}

export function Header({ activeRole, onRoleSwitch }: HeaderProps) {
  const { userData } = useAuth();
  const { isDark, toggle } = useTheme();
  const { showToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch { showToast('حدث خطأ أثناء تسجيل الخروج.', true); }
  };

  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="logo-wrapper">
              <img src="https://i.ibb.co/wZ5MX8R4/4897896.jpg" alt="شعار جمعية شباب الغد المتميز" className="logo-img" />
              <span className="logo-badge">101</span>
            </div>
            <div className="brand-info">
              <div className="brand-title-row">
                <span className="brand-name">Al-Khwarizmi 101</span>
                <span className="club-badge">النادي العلمي</span>
              </div>
              <h1 className="brand-sub">بوابة جمعية شباب الغد المتميز السحابية</h1>
              {userData && (
                <p className="user-badge-text">
                  <i className="fa-solid fa-user-shield" style={{ fontSize: '10px', color: 'var(--primary)' }}></i>
                  {' '}{userData.name} | <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{userData.cohort}</span>
                </p>
              )}
            </div>
          </div>

          <div className="header-actions">
            <div className="role-tabs" role="tablist">
              <button
                id="btnStudentRole"
                onClick={() => onRoleSwitch('student')}
                role="tab"
                aria-selected={activeRole === 'student'}
                className={`role-btn ${activeRole === 'student' ? 'active' : ''}`}
              >
                👨‍🎓 <span>بوابة الطالب</span>
              </button>
              {userData?.role === 'teacher' && (
                <button
                  id="btnTeacherRole"
                  onClick={() => onRoleSwitch('teacher')}
                  role="tab"
                  aria-selected={activeRole === 'teacher'}
                  className={`role-btn ${activeRole === 'teacher' ? 'active' : ''}`}
                >
                  👨‍🏫 <span>لوحة الأستاذ</span>
                </button>
              )}
            </div>

            <button onClick={toggle} className="icon-btn" title="تبديل المظهر" aria-label="تبديل المظهر">
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} style={isDark ? { color: 'var(--secondary)' } : {}}></i>
            </button>

            <button onClick={() => setShowLogoutConfirm(true)} className="icon-btn logout-btn" title="تسجيل الخروج" aria-label="تسجيل الخروج">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      <ConfirmModal
        open={showLogoutConfirm}
        title="تسجيل الخروج"
        message="هل تريد فعلاً تسجيل الخروج من بوابة النادي؟"
        confirmText="تسجيل الخروج"
        onConfirm={handleLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
