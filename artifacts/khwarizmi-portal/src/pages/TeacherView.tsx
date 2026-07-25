import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, query, where, getDocs
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { getFirebaseErrorMessage, sanitizeURL, typeIcons } from '@/lib/utils';
import type { UserData, Resource, Suggestion, ResourceType } from '@/lib/types';

export function TeacherView() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<UserData[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [cohortFilter, setCohortFilter] = useState('الكل');
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name?: string } | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Add resource form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<ResourceType>('محاضرة');
  const [newDuration, setNewDuration] = useState(20);
  const [newDifficulty, setNewDifficulty] = useState(1);
  const [newLink, setNewLink] = useState('');
  const [newCloud, setNewCloud] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'users'), where('approved', '==', true)), snap => {
      const arr: UserData[] = [];
      snap.forEach(d => arr.push(d.data() as UserData));
      setStudents(arr);
    });
    const u2 = onSnapshot(query(collection(db, 'users'), where('approved', '==', false)), snap => {
      const arr: UserData[] = [];
      snap.forEach(d => arr.push(d.data() as UserData));
      setPendingUsers(arr);
    });
    const u3 = onSnapshot(collection(db, 'suggestions'), snap => {
      const arr: Suggestion[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() } as Suggestion));
      arr.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setSuggestions(arr);
    });
    const u4 = onSnapshot(collection(db, 'resources'), snap => {
      const arr: Resource[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() } as Resource));
      setResources(arr);
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const approveUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { approved: true });
      showToast('✔️ تم قبول وتنشيط ملف حساب الطالب بنجاح');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const deleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      showToast('❌ تم تصفية وحذف العضو بنجاح من الخادم');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const updateGrade = async (uid: string, field: 'python' | 'hackathon', value: string) => {
    const val = Math.max(0, Math.min(20, parseFloat(value) || 0));
    try {
      await updateDoc(doc(db, 'users', uid), { [field]: val });
      showToast('💾 تم حفظ العلامة وتحديث المعدل فورياً');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const approveSuggestion = async (sug: Suggestion) => {
    try {
      await addDoc(collection(db, 'resources'), {
        title: sug.title, description: '', type: sug.type,
        duration: 20, difficulty: 1, link: sug.link || '#', cloudLink: '',
        createdAt: serverTimestamp()
      });
      await deleteDoc(doc(db, 'suggestions', sug.id));
      showToast('🚀 تم اعتماد مساهمة الطالب ونشرها بنجاح!');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      showToast('🗑️ تم رفض وإزالة المقترح المعلق');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const addResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) { showToast('يرجى كتابة عنوان للمادة أولاً.', true); return; }
    setAddLoading(true);
    try {
      await addDoc(collection(db, 'resources'), {
        title: newTitle.trim(), description: newDesc.trim(),
        type: newType, duration: Math.max(1, newDuration || 20),
        difficulty: newDifficulty,
        link: newLink.trim() || '#', cloudLink: newCloud.trim(),
        createdAt: serverTimestamp()
      });
      showToast('🚀 تم نشر المصدر التعليمي بنجاح في سحابة النادي!');
      setNewTitle(''); setNewDesc(''); setNewLink(''); setNewCloud(''); setNewDuration(20); setNewDifficulty(1);
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
    finally { setAddLoading(false); }
  };

  const deleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      showToast('🗑️ تم حذف المادة التعليمية بنجاح');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const exportCSV = () => {
    const studentsOnly = students.filter(s => s.role !== 'teacher');
    const filtered = cohortFilter === 'الكل' ? studentsOnly : studentsOnly.filter(s => s.cohort === cohortFilter);
    if (filtered.length === 0) { showToast('لا توجد بيانات لتصديرها حالياً.', true); return; }
    const headers = ['الاسم', 'الفوج', 'الفريق', 'بايثون', 'هاكاثون', 'المعدل'];
    const rows = filtered.map(s => [s.name, s.cohort, s.team, s.python, s.hackathon, (((s.python || 0) + (s.hackathon || 0)) / 2).toFixed(1)]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `سجل_العلامات_${cohortFilter === 'الكل' ? 'جميع_الأفواج' : cohortFilter}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('📊 تم تصدير سجل العلامات بنجاح');
  };

  const printCertificate = (s: UserData) => {
    const avg = (((s.python || 0) + (s.hackathon || 0)) / 2).toFixed(1);
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const el = document.getElementById('certificateSection')!;
    el.innerHTML = `<div style="width:100%;height:100%;border:8px double #0f766e;color:#1c1917;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1rem;padding:2rem;"><div style="font-size:3rem;">🏆</div><div style="font-size:12px;letter-spacing:0.1em;color:#6b7280;font-weight:700;">جمعية شباب الغد المتميز — نادي الخوارزمي العلمي</div><h1 style="font-size:2.5rem;font-weight:900;color:#134e4a;margin:0.5rem 0;">شهادة تقدير</h1><p style="color:#4b5563;">تشهد إدارة النادي العلمي بأن الطالب(ة)</p><h2 style="font-size:2rem;font-weight:900;color:#1f2937;">${s.name}</h2><p style="color:#4b5563;">من ${s.cohort} قد أظهر(ت) التزاماً وتفوقاً بمعدل عام قدره</p><div style="font-size:3.5rem;font-weight:900;color:#d97706;">${avg} / 20</div><p style="color:#9ca3af;font-size:14px;margin-top:1.5rem;">حُررت بتاريخ: ${today}</p></div>`;
    window.print();
    window.addEventListener('afterprint', () => { el.innerHTML = ''; }, { once: true });
  };

  // KPIs
  const studentsOnly = students.filter(s => s.role !== 'teacher');
  const maleCount = studentsOnly.filter(s => s.cohort === 'فوج الذكور').length;
  const femaleCount = studentsOnly.filter(s => s.cohort === 'فوج الإناث').length;
  const avgAll = studentsOnly.length ? (studentsOnly.reduce((acc, s) => acc + ((s.python || 0) + (s.hackathon || 0)) / 2, 0) / studentsOnly.length).toFixed(1) : '0.0';

  // Charts
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const cohorts = ['فوج الذكور', 'فوج الإناث'];
  const chartData = cohorts.map(c => {
    const arr = studentsOnly.filter(s => s.cohort === c);
    const pyAvg = arr.length ? arr.reduce((a, s) => a + (s.python || 0), 0) / arr.length : 0;
    const hackAvg = arr.length ? arr.reduce((a, s) => a + (s.hackathon || 0), 0) / arr.length : 0;
    return { name: c, بايثون: parseFloat(pyAvg.toFixed(1)), هاكاثون: parseFloat(hackAvg.toFixed(1)) };
  });
  const excellent = studentsOnly.filter(s => ((s.python || 0) + (s.hackathon || 0)) / 2 >= 15).length;
  const good = studentsOnly.filter(s => { const a = ((s.python || 0) + (s.hackathon || 0)) / 2; return a >= 10 && a < 15; }).length;
  const needsWork = studentsOnly.filter(s => ((s.python || 0) + (s.hackathon || 0)) / 2 < 10).length;
  const pieData = [
    { name: 'ممتاز (15+)', value: excellent, color: '#0f766e' },
    { name: 'جيد (10-15)', value: good, color: '#d97706' },
    { name: 'يحتاج دعم', value: needsWork, color: '#e11d48' }
  ].filter(d => d.value > 0);

  const gradebookStudents = cohortFilter === 'الكل' ? studentsOnly : studentsOnly.filter(s => s.cohort === cohortFilter);

  return (
    <section className="view-panel">
      {/* Pending Users */}
      <div className="table-container-card">
        <h3 className="table-header-row table-title" style={{ color: 'var(--secondary)' }}>
          <span><i className="fa-solid fa-user-clock animate-pulse"></i> طلبات الانضمام المعلقة (تطلب تفعيلك اليدوي)</span>
        </h3>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>اسم الطالب الكامل</th>
                <th style={{ width: '25%', textAlign: 'left' }}>البريد الإلكتروني</th>
                <th style={{ width: '25%' }}>الفوج والأكاديميا</th>
                <th style={{ width: '25%', textAlign: 'center' }}>إجراء التفعيل</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontWeight: 500 }}>لا توجد طلبات انضمام معلقة حالياً.</td></tr>
              ) : pendingUsers.map(u => (
                <tr key={u.uid}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td style={{ textAlign: 'left' }} dir="ltr">{u.email}</td>
                  <td style={{ fontWeight: 700 }}>{u.cohort}<span style={{ fontSize: '10px', color: 'var(--primary)', display: 'block', fontWeight: 500 }}>{u.team}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => approveUser(u.uid)} className="table-btn">✔️ قبول وتفعيل</button>
                      <button onClick={() => setDeleteTarget({ type: 'user', id: u.uid, name: u.name })} className="table-btn table-btn-danger">رفض وحذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Suggestions */}
      <div className="table-container-card">
        <h3 className="table-header-row table-title" style={{ color: 'var(--primary)' }}>
          <span><i className="fa-solid fa-wand-magic-sparkles"></i> المواد المقترحة من الأعضاء للتعميم</span>
        </h3>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>العضو صاحب الاقتراح</th>
                <th style={{ width: '40%' }}>المحتوى والعنوان المقترح</th>
                <th style={{ width: '15%' }}>نوع التصنيف</th>
                <th style={{ width: '20%', textAlign: 'center' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontWeight: 500 }}>لا توجد مساهمات معلقة من الطلاب حالياً.</td></tr>
              ) : suggestions.map(sug => (
                <tr key={sug.id}>
                  <td style={{ fontWeight: 700, fontSize: '12px' }}>{sug.studentName || 'عضو في النادي'}</td>
                  <td>
                    <span style={{ fontWeight: 700, display: 'block' }}>{sug.title}</span>
                    {sug.link && sug.link !== '#' && (
                      <a href={sanitizeURL(sug.link)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline', fontSize: '10px' }}>
                        <i className="fa-solid fa-link"></i> معاينة الرابط
                      </a>
                    )}
                  </td>
                  <td><span className="resource-type-tag" style={{ fontSize: '11px' }}>{typeIcons[sug.type] || '💡'} {sug.type}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => approveSuggestion(sug)} className="table-btn">✔️ اعتماد ونشر</button>
                      <button onClick={() => setDeleteTarget({ type: 'suggestion', id: sug.id })} className="table-btn table-btn-secondary">رفض وإلغاء</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-val">{studentsOnly.length}</div><div className="kpi-label">إجمالي الأعضاء النشطين</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--primary)' }}>{maleCount}</div><div className="kpi-label">فوج الذكور</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: '#a855f7' }}>{femaleCount}</div><div className="kpi-label">فوج الإناث</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--secondary)' }}>{avgAll}</div><div className="kpi-label">المعدل العام للنادي (من 20)</div></div>
      </div>

      {/* Charts */}
      {studentsOnly.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="chart-title"><i className="fa-solid fa-chart-column" style={{ color: 'var(--primary)' }}></i> مقارنة المعدلات بين الأفواج</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(226,232,240,0.05)' : 'rgba(71,85,105,0.05)'} />
                <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11, fontFamily: 'Tajawal' }} />
                <YAxis domain={[0, 20]} tick={{ fill: textColor, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: isDark ? '#111827' : '#fff', border: '1px solid var(--border)', borderRadius: '0.5rem', fontFamily: 'Tajawal' }} />
                <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 12, color: textColor }} />
                <Bar dataKey="بايثون" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="هاكاثون" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-title"><i className="fa-solid fa-chart-pie" style={{ color: 'var(--secondary)' }}></i> توزيع مستويات الأداء</h3>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10} fontFamily="Tajawal">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: isDark ? '#111827' : '#fff', border: '1px solid var(--border)', borderRadius: '0.5rem', fontFamily: 'Tajawal' }} />
                <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 12, color: textColor }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add Resource Form */}
      <div className="resource-form-card">
        <h3 className="table-title" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--primary)' }}></i> إضافة مادة أو شيفرة برمجية جديدة في السحابة
        </h3>
        <form onSubmit={addResource} className="form-grid-3">
          <div className="grid-span-3">
            <label className="form-label" htmlFor="newTitle">عنوان المادة أو الكود بالتفصيل</label>
            <input type="text" id="newTitle" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="مثال: خوارزمية الأداء وتقليل الأبعاد باستخدام الخوارزميات الجينية (GA)" className="brand-input" maxLength={120} />
          </div>
          <div className="grid-span-3">
            <label className="form-label" htmlFor="newDesc">وصف مختصر (اختياري)</label>
            <textarea id="newDesc" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} maxLength={240} placeholder="جملة أو جملتان توضحان محتوى المادة للطالب" className="brand-input" />
          </div>
          <div>
            <label className="form-label" htmlFor="newType">نوع المورد التعليمي</label>
            <select id="newType" value={newType} onChange={e => setNewType(e.target.value as ResourceType)} className="brand-input brand-select">
              <option value="محاضرة">📚 محاضرة علمية</option>
              <option value="فيديو">🎥 فيديو تعليمي</option>
              <option value="كود بايثون">🐍 كود بايثون نظيف</option>
              <option value="برومبت">💬 برومبت هندسة أوامر</option>
              <option value="مصطلح">📖 شرح مصطلح علمي</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="newDuration">المدة التقديرية (دقائق)</label>
            <input type="number" id="newDuration" value={newDuration} onChange={e => setNewDuration(parseInt(e.target.value) || 20)} placeholder="20" className="brand-input" min={1} max={300} />
          </div>
          <div>
            <label className="form-label" htmlFor="newDifficulty">مستوى الصعوبة</label>
            <select id="newDifficulty" value={newDifficulty} onChange={e => setNewDifficulty(parseInt(e.target.value))} className="brand-input brand-select">
              <option value={1}>⭐ مبسط / أساسي</option>
              <option value={2}>⭐⭐ متوسط الصعوبة</option>
              <option value={3}>⭐⭐⭐ متقدم / معقد</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="newLink">رابط المورد الأساسي</label>
            <input type="url" id="newLink" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://link-to-resource.com" className="brand-input" style={{ textAlign: 'left' }} dir="ltr" />
          </div>
          <div className="grid-span-2">
            <label className="form-label" htmlFor="newCloud">رابط التشغيل السحابي (Google Colab / GitHub) - اختياري</label>
            <input type="url" id="newCloud" value={newCloud} onChange={e => setNewCloud(e.target.value)} placeholder="https://colab.research.google.com/..." className="brand-input" style={{ textAlign: 'left' }} dir="ltr" />
          </div>
          <button type="submit" className="submit-btn grid-span-3" disabled={addLoading}>
            {addLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> <span>جاري النشر...</span></> : <><i className="fa-solid fa-bullhorn" style={{ fontSize: '12px' }}></i> <span>نشر واعتماد فوري في سحابة النادي</span></>}
          </button>
        </form>
      </div>

      {/* Gradebook */}
      <div className="table-container-card">
        <div className="table-header-row">
          <h3 className="table-title"><i className="fa-solid fa-table-list" style={{ color: 'var(--text-secondary)' }}></i> دفتر رصد العلامات والمتابعة الأكاديمية</h3>
          <div className="table-actions">
            <select value={cohortFilter} onChange={e => setCohortFilter(e.target.value)} className="brand-input brand-select chat-room-select">
              <option value="الكل">جميع الأفواج بنظرة شمولية</option>
              <option value="فوج الذكور">فوج الذكور</option>
              <option value="فوج الإناث">فوج الإناث</option>
            </select>
            <button onClick={exportCSV} className="table-btn table-btn-secondary">
              <i className="fa-solid fa-file-csv"></i> تصدير CSV
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>الاسم الكامل للعضو</th>
                <th style={{ width: '22%' }}>التصنيف</th>
                <th style={{ width: '16%', textAlign: 'center' }}>بايثون (من 20)</th>
                <th style={{ width: '16%', textAlign: 'center' }}>هاكاثون (من 20)</th>
                <th style={{ width: '12%', textAlign: 'center' }}>المعدل</th>
                <th style={{ width: '12%', textAlign: 'center' }}>إدارة</th>
              </tr>
            </thead>
            <tbody>
              {gradebookStudents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontWeight: 500 }}>لا يوجد طلاب مسجلون في هذا الفوج حتى الآن.</td></tr>
              ) : gradebookStudents.map(s => {
                const avg = ((s.python || 0) + (s.hackathon || 0)) / 2;
                const badgeClass = avg >= 15 ? 'badge-grade excellent' : avg >= 10 ? 'badge-grade good' : 'badge-grade fail';
                return (
                  <tr key={s.uid}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td style={{ fontWeight: 700 }}>{s.cohort}<br /><span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>{s.team}</span></td>
                    <td><input type="number" step="0.5" min="0" max="20" defaultValue={s.python} onBlur={e => updateGrade(s.uid, 'python', e.target.value)} className="grade-input" /></td>
                    <td><input type="number" step="0.5" min="0" max="20" defaultValue={s.hackathon} onBlur={e => updateGrade(s.uid, 'hackathon', e.target.value)} className="grade-input" /></td>
                    <td><span className={badgeClass}>{avg.toFixed(1)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button onClick={() => printCertificate(s)} aria-label="طباعة شهادة" title="طباعة شهادة تقدير" className="icon-action-btn award-icon"><i className="fa-solid fa-award"></i></button>
                        <button onClick={() => setDeleteTarget({ type: 'student', id: s.uid, name: s.name })} aria-label="حذف الطالب" title="حذف الطالب" className="icon-action-btn delete-icon"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources Table for Teacher */}
      <div className="table-container-card">
        <h3 className="table-header-row table-title"><i className="fa-solid fa-database" style={{ color: 'var(--text-secondary)' }}></i> قائمة الموارد المنشورة ({resources.length})</h3>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>النوع</th>
                <th>الصعوبة</th>
                <th style={{ textAlign: 'center' }}>حذف</th>
              </tr>
            </thead>
            <tbody>
              {resources.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>لا توجد موارد منشورة بعد.</td></tr>
              ) : resources.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td><span className="resource-type-tag">{typeIcons[r.type] || '📄'} {r.type}</span></td>
                  <td>{'⭐'.repeat(r.difficulty || 1)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => setDeleteTarget({ type: 'resource', id: r.id, name: r.title })} className="icon-action-btn delete-icon"><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?.type === 'user' || deleteTarget?.type === 'student' ? 'حذف العضو' : deleteTarget?.type === 'suggestion' ? 'رفض الاقتراح' : 'حذف المورد'}
        message={`هل أنت متأكد من حذف "${deleteTarget?.name || 'هذا العنصر'}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف نهائي"
        danger
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'user' || deleteTarget.type === 'student') deleteUser(deleteTarget.id);
          else if (deleteTarget.type === 'suggestion') deleteSuggestion(deleteTarget.id);
          else if (deleteTarget.type === 'resource') deleteResource(deleteTarget.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <section id="certificateSection" aria-hidden="true" style={{ display: 'none' }} />
    </section>
  );
}
