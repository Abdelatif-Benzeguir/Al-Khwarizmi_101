import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, TEACHER_EMAIL } from '@/lib/firebase';
import { useTheme } from '@/hooks/useTheme';
import { getFirebaseErrorMessage } from '@/lib/utils';

export function LandingPage() {
  const { isDark, toggle } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cohort, setCohort] = useState('فوج الذكور');
  const [team, setTeam] = useState('الذكاء والبيانات');

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) { setError('يرجى تعبئة البريد الإلكتروني وكلمة المرور.'); return; }

    try {
      setLoading(true);
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name || name.trim().split(/\s+/).length < 2) {
          setError('يرجى كتابة الاسم الثلاثي الكامل أولاً لتسهيل المراجعة.'); setLoading(false); return;
        }
        if (password.length < 6) {
          setError('كلمة المرور يجب أن تحتوي على 6 خانات على الأقل.'); setLoading(false); return;
        }
        const isTeacher = email.toLowerCase() === TEACHER_EMAIL.toLowerCase();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: isTeacher ? 'الأستاذ المشرف العام' : name.trim(),
          email,
          cohort: isTeacher ? 'إدارة النادي' : cohort,
          team: isTeacher ? 'المشرف العام والأكاديمي' : team,
          approved: isTeacher,
          role: isTeacher ? 'teacher' : 'student',
          python: 0,
          hackathon: 0,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('يرجى كتابة بريدك الإلكتروني أولاً في الحقل أعلاه.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('');
      alert('📧 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code) || err.message);
    }
  };

  return (
    <section className="landing-section">
      <header className="landing-header">
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
            </div>
          </div>
          <div className="header-actions">
            <button onClick={toggle} className="icon-btn" title="تبديل المظهر">
              <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} style={isDark ? { color: 'var(--secondary)' } : {}}></i>
            </button>
            <a href="#features" className="hero-btn-explore" style={{ padding: '0.5rem 1rem', margin: 0, fontSize: '11px' }}>
              <i className="fa-solid fa-compass"></i> استكشف المزايا
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero" id="home">
        <div className="hero-grid">
          <div className="hero-info">
            <span className="hero-badge-tag">منصتكم السحابية التفاعلية 🚀</span>
            <h2 className="hero-title">بوابتك نحو استكشاف<br /><span>الذكاء الاصطناعي وهندسة البيانات</span></h2>
            <p className="hero-desc">مرحباً بكم في البوابة السحابية الرسمية لأعضاء نادي الخوارزمي العلمي. هنا ستجد كل المحاضرات الأكاديمية والشيفرات البرمجية، بالإضافة إلى مستشار ذكاء اصطناعي تفاعلي لمساعدتكم في مشاريعكم المبتكرة.</p>
            <div className="hero-buttons">
              <a href="#loginSection" className="submit-btn" style={{ margin: 0, width: 'auto', padding: '0.85rem 1.5rem', textDecoration: 'none' }}>
                <span>ادخل إلى المنصة</span> <i className="fa-solid fa-arrow-left-to-bracket"></i>
              </a>
            </div>
          </div>

          <div className="hero-illustration-wrapper">
            <svg className="ai-svg-canvas" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="cyberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
              <circle className="ai-math-orbit" cx="100" cy="100" r="90" stroke="var(--primary)" strokeWidth="0.8" strokeDasharray="3 6 12 6" fill="none" opacity="0.15" />
              <circle className="ai-math-orbit" cx="100" cy="100" r="75" stroke="var(--secondary)" strokeWidth="0.8" strokeDasharray="10 10" fill="none" opacity="0.2" />
              <g className="ai-brain-gear" fill="none" stroke="var(--secondary)" strokeWidth="1.8" opacity="0.7">
                <circle cx="65" cy="100" r="22" strokeDasharray="4 2" />
                <path d="M65,70 L65,130 M35,100 L95,100 M44,79 L86,121 M44,121 L86,79" strokeWidth="1" />
                <circle cx="65" cy="100" r="6" fill="var(--bg-primary)" stroke="var(--secondary)" strokeWidth="1.5" />
              </g>
              <g className="ai-brain-gear-small" fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6">
                <circle cx="90" cy="135" r="14" strokeDasharray="3 2" />
                <circle cx="90" cy="135" r="4" fill="var(--bg-primary)" stroke="var(--primary)" strokeWidth="1" />
              </g>
              <g fill="none" stroke="var(--primary)" strokeWidth="1.5" opacity="0.7">
                <path className="ai-brain-circuit" d="M100,50 C125,50 145,65 145,95 C145,115 130,125 120,130 L115,145" />
                <path className="ai-brain-circuit-fast" d="M100,70 C115,70 125,80 125,95 C125,110 115,115 105,120" />
                <path className="ai-brain-circuit" d="M100,150 C130,150 155,130 155,95" stroke="var(--secondary)" strokeDasharray="5 5" />
                <path d="M125,95 L145,95" strokeWidth="1" />
                <path d="M120,130 L135,140" strokeWidth="1" />
                <path d="M115,75 L130,65" strokeWidth="1" />
              </g>
              <circle className="ai-brain-node" cx="145" cy="95" r="4" fill="var(--secondary)" />
              <circle className="ai-brain-node" cx="120" cy="130" r="3.5" fill="var(--primary)" />
              <circle className="ai-brain-node" cx="130" cy="65" r="3" fill="var(--secondary)" />
              <circle className="ai-brain-node" cx="115" cy="145" r="4" fill="var(--primary)" />
              <circle className="ai-brain-node" cx="100" cy="50" r="4.5" fill="var(--primary)" />
              <circle className="ai-brain-node" cx="100" cy="150" r="4.5" fill="var(--secondary)" />
              <g className="ai-brain-core-g">
                <circle cx="100" cy="100" r="14" fill="url(#cyberGlow)" opacity="0.25" />
                <rect x="91" y="91" width="18" height="18" rx="3" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="2" />
                <path d="M96,98 L104,98 M96,102 L104,102 M100,95 L100,105" stroke="var(--secondary)" strokeWidth="1" />
                <circle cx="100" cy="100" r="2" fill="var(--secondary)" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Login Card */}
      <section className="landing-login-wrap" id="loginSection">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-icon"><i className="fa-solid fa-shield-halved"></i></div>
            <h2 className="auth-title">{mode === 'login' ? 'بوابة الدخول الآمنة' : 'إنشاء طلب انضمام جديد'}</h2>
            <p className="auth-subtitle">سجل دخولك للوصول إلى الموارد والمجموعات</p>
          </div>

          <div className="auth-tabs">
            <button onClick={() => switchMode('login')} className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}>تسجيل الدخول</button>
            <button onClick={() => switchMode('register')} className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}>طلب انضمام جديد</button>
          </div>

          {error && (
            <div className="error-box flex" role="alert">
              <i className="fa-solid fa-circle-exclamation" style={{ marginTop: '0.15rem' }}></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="authName">الاسم الثلاثي الكامل</label>
                  <input type="text" id="authName" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: عبد اللطيف بن زقير" className="brand-input" maxLength={60} />
                </div>
                <div className="form-group input-row">
                  <div>
                    <label className="form-label" htmlFor="authCohort">الفوج</label>
                    <select id="authCohort" value={cohort} onChange={e => setCohort(e.target.value)} className="brand-input brand-select">
                      <option value="فوج الذكور">فوج الذكور</option>
                      <option value="فوج الإناث">فوج الإناث</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="authTeam">الفريق المهني</label>
                    <select id="authTeam" value={team} onChange={e => setTeam(e.target.value)} className="brand-input brand-select">
                      <option value="الذكاء والبيانات">الذكاء والبيانات</option>
                      <option value="الواجهة والتصميم">الواجهة والتصميم</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="authEmail">البريد الإلكتروني</label>
              <input type="email" id="authEmail" value={email} onChange={e => setEmail(e.target.value)} required placeholder="username@example.com" className="brand-input" style={{ textAlign: 'left' }} dir="ltr" />
            </div>

            <div className="form-group">
              <div className="password-label-row">
                <label className="form-label" htmlFor="authPassword">كلمة المرور</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleForgotPassword} className="forgot-password-btn">نسيت كلمة المرور؟</button>
                )}
              </div>
              <input type="password" id="authPassword" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="brand-input" style={{ textAlign: 'left' }} dir="ltr" minLength={6} />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> <span>جارٍ التحقق...</span></>
              ) : (
                <><span>{mode === 'login' ? 'دخول للمنصة' : 'إرسال طلب الانضمام'}</span> <i className="fa-solid fa-arrow-left-to-bracket"></i></>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-lbl">مميزات المنصة التعليمية</span>
            <h3 className="section-title">كل ما تحتاجه للتميز العلمي والتقني</h3>
          </div>
          <div className="features-grid">
            {[
              { icon: 'fa-book-open', title: 'المحاضرات العلمية', desc: 'الوصول السريع والمنظم لجميع العروض التقديمية والملفات العلمية المعتمدة.' },
              { icon: 'fa-terminal', title: 'أكواد بايثون نظيفة', desc: 'أمثلة تطبيقية ونماذج خوارزمية منظمة ومهيأة للتشغيل الفوري والسحابي.' },
              { icon: 'fa-graduation-cap', title: 'الاختبارات الذاتية', desc: 'نظام كويز تفاعلي متطور لاختبار منطق البرمجة واستيعاب المفاهيم النظرية.' },
              { icon: 'fa-comments', title: 'نقاشات ومتابعة الأفواج', desc: 'مساحة تفاعلية حية للتعاون البرمجي والمتابعة الفورية والتوجيه مع الأستاذ.' }
            ].map((f, i) => (
              <div key={i} className="landing-feature-card">
                <div className="feature-icon-box"><i className={`fa-solid ${f.icon}`}></i></div>
                <h4 className="feature-card-title">{f.title}</h4>
                <p className="feature-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-stats" id="stats">
        <div className="stats-container">
          {[
            { num: '101', lbl: 'اسم الهوية والتميز' },
            { num: '50+', lbl: 'مورد تعليمي سحابي' },
            { num: '100%', lbl: 'تفاعل وتوجيه أكاديمي' },
            { num: '2', lbl: 'فوج دراسي (ذكور وإناث)' }
          ].map((s, i) => (
            <div key={i} className="stat-item">
              <div className="stat-number">{s.num}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-logo-row">
            <img src="https://i.ibb.co/wZ5MX8R4/4897896.jpg" alt="شعار" className="footer-logo-img" />
            <span className="footer-logo-name">نادي الخوارزمي العلمي</span>
          </div>
          <div className="footer-copy">حقوق الطبع محفوظة © 2026. جمعية شباب الغد المتميز.</div>
        </div>
      </footer>
    </section>
  );
}
