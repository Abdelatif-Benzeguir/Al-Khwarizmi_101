import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Quiz } from '@/components/Quiz';
import { VideoModal } from '@/components/VideoModal';
import { getFirebaseErrorMessage, sanitizeURL, extractYouTubeId, getRelativeTime, typeIcons, debounce } from '@/lib/utils';
import type { Resource, ResourceType } from '@/lib/types';

const RESOURCES_PER_PAGE = 6;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'الكل', value: 'الكل' },
  { label: '📚 محاضرات', value: 'محاضرة' },
  { label: '🎥 فيديوهات', value: 'فيديو' },
  { label: '🐍 أكواد بايثون', value: 'كود بايثون' },
  { label: '💬 برومبتات', value: 'برومبت' },
  { label: '📖 مصطلحات', value: 'مصطلح' },
];

export function StudentView() {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('الكل');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [videoModal, setVideoModal] = useState<{ id: string; title: string } | null>(null);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestType, setSuggestType] = useState('برومبت');
  const [suggestLink, setSuggestLink] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'resources'), (snap) => {
      const docs: Resource[] = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() } as Resource));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setResources(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
      showToast('تعذر تحميل الموارد التعليمية حالياً.', true);
    });
    return () => unsub();
  }, []);

  const filtered = resources.filter(r =>
    (filter === 'الكل' || r.type === filter) &&
    (r.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const visible = filtered.slice(0, page * RESOURCES_PER_PAGE);
  const hasMore = visible.length < filtered.length;

  const debouncedSearch = useCallback(debounce((v: string) => {
    setSearch(v);
    setPage(1);
  }, 300), []);

  const handleFilterChange = (val: string) => {
    setFilter(val);
    setPage(1);
  };

  const handleSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestTitle.trim()) { showToast('يرجى كتابة عنوان الاقتراح.', true); return; }
    setSuggestLoading(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        title: suggestTitle.trim(),
        type: suggestType,
        link: suggestLink.trim() || '#',
        studentName: userData?.name,
        studentUid: userData?.uid,
        timestamp: serverTimestamp()
      });
      showToast('💡 تم إرسال اقتراحك بنجاح، سيقوم الأستاذ بمراجعته قريباً!');
      setSuggestTitle(''); setSuggestLink('');
    } catch (err: any) {
      showToast(getFirebaseErrorMessage(err.code) || 'حدث خطأ أثناء رفع الاقتراح.', true);
    } finally { setSuggestLoading(false); }
  };

  const openVideo = (resource: Resource) => {
    const videoId = extractYouTubeId(resource.link);
    if (videoId) {
      setVideoModal({ id: videoId, title: resource.title });
    } else if (resource.link && resource.link !== '#') {
      window.open(sanitizeURL(resource.link), '_blank', 'noopener,noreferrer');
    } else {
      showToast('عذراً، رابط الفيديو غير صالح أو غير متاح.', true);
    }
  };

  return (
    <>
      <section className="view-panel">
        <div className="student-grid">
          {/* Welcome + Search */}
          <div className="welcome-banner">
            <div>
              <h2 className="welcome-title">مرحباً بك في بوابة الموارد السحابية 👋</h2>
              <p className="welcome-desc">جميع الموارد والشيفرات البرمجية محدثة فورياً من طرف الأستاذ المشرف.</p>
            </div>
            <div className="search-container">
              <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
              <input
                type="text"
                onChange={e => debouncedSearch(e.target.value)}
                placeholder="ابحث عن مادة، كود بايثون، أو مصطلح علمي..."
                className="brand-input search-input"
                aria-label="ابحث في الموارد"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Grades Card */}
            {userData && (
              <div className="grades-card">
                <h3 className="grades-title"><i className="fa-solid fa-chart-line"></i> لوحة علاماتي الشخصية</h3>
                <div className="grades-grid">
                  <div className="grade-box">
                    <div className="grade-label">بايثون</div>
                    <div className="grade-val">{userData.python ?? 0}</div>
                  </div>
                  <div className="grade-box">
                    <div className="grade-label">هاكاثون</div>
                    <div className="grade-val">{userData.hackathon ?? 0}</div>
                  </div>
                  <div className="grade-box average">
                    <div className="grade-label">المعدل</div>
                    <div className="grade-val">{(((userData.python ?? 0) + (userData.hackathon ?? 0)) / 2).toFixed(1)}</div>
                  </div>
                </div>
              </div>
            )}

            <Quiz />

            {/* Suggestion Form */}
            <div className="suggestion-card">
              <h3 className="suggestion-title">
                <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b' }}></i> شارك في إثراء النادي العلمي 💡
              </h3>
              <p className="suggestion-desc">هل كتبت برومبت ذكي هندسي أو تريد مشاركة كود؟ اقترحه الآن ليراجعه الأستاذ وينشره للجميع.</p>
              <form onSubmit={handleSuggestion} className="suggestion-form">
                <input type="text" value={suggestTitle} onChange={e => setSuggestTitle(e.target.value)} required placeholder="العنوان (مثال: كود معالجة البيانات)" className="brand-input" />
                <div className="suggestion-form-row">
                  <select value={suggestType} onChange={e => setSuggestType(e.target.value)} className="brand-input brand-select">
                    <option value="برومبت">💬 برومبت</option>
                    <option value="مصطلح">📖 مصطلح</option>
                    <option value="كود بايثون">🐍 كود بايثون</option>
                  </select>
                  <button type="submit" className="suggestion-submit-btn" disabled={suggestLoading}>
                    {suggestLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><span>إرسال الاقتراح</span> <i className="fa-solid fa-paper-plane"></i></>}
                  </button>
                </div>
                <input type="url" value={suggestLink} onChange={e => setSuggestLink(e.target.value)} placeholder="رابط خارجي (اختياري)" className="brand-input" style={{ textAlign: 'left' }} dir="ltr" />
              </form>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-wrapper">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`filter-btn ${filter === opt.value ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="resources-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="resource-card">
                <div className="skeleton" style={{ height: '1rem', width: '50%' }}></div>
                <div className="skeleton" style={{ height: '1.25rem', width: '75%', marginTop: '0.5rem' }}></div>
                <div className="skeleton" style={{ height: '3rem', width: '100%', marginTop: '0.5rem' }}></div>
                <div className="skeleton" style={{ height: '2.25rem', width: '100%', marginTop: '0.75rem' }}></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-box-open"></i></div>
            <h3 className="empty-state-title">لا توجد مواد أو برومبتات برمجية هنا حالياً</h3>
            <p className="empty-state-desc">حاول تعديل شروط البحث أو الفلتر للعثور على مستندات مغايرة.</p>
          </div>
        ) : (
          <>
            <div className="resources-grid">
              {visible.map((r, index) => {
                const isNew = r.createdAt?.toMillis && (Date.now() - r.createdAt.toMillis()) < THREE_DAYS_MS;
                const animDelay = index >= (page - 1) * RESOURCES_PER_PAGE ? `${(index % RESOURCES_PER_PAGE) * 0.08}s` : undefined;

                if (r.type === 'فيديو') {
                  const videoId = extractYouTubeId(r.link);
                  const thumb = videoId
                    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                    : 'https://placehold.co/480x270/1e293b/64748b?text=فيديو';
                  const relTime = getRelativeTime(r.createdAt);
                  return (
                    <div key={r.id} className="video-card card-fade-in" style={animDelay ? { animationDelay: animDelay } : {}} onClick={() => openVideo(r)} role="button" tabIndex={0}>
                      {isNew && <span className="badge-new">جديد</span>}
                      <div className="video-thumbnail-wrap">
                        <img src={thumb} alt={r.title} className="video-thumbnail" loading="lazy" />
                        <div className="video-overlay"><div className="video-play-icon"><i className="fa-solid fa-play" style={{ marginRight: '-2px' }}></i></div></div>
                      </div>
                      <div className="video-info-section">
                        <img src="https://i.ibb.co/wZ5MX8R4/4897896.jpg" alt="" className="video-channel-avatar" loading="lazy" />
                        <div className="video-text-block">
                          <h4 className="video-card-title">{r.title}</h4>
                          <div className="video-meta-line">
                            <span className="meta-channel">نادي الخوارزمي</span>
                            <i className="fa-solid fa-circle meta-dot"></i>
                            <span>{relTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const icon = typeIcons[r.type] || '📄';
                const stars = '⭐'.repeat(r.difficulty || 1);
                const safeLink = sanitizeURL(r.link);
                const safeCloud = sanitizeURL(r.cloudLink);

                return (
                  <div key={r.id} className="resource-card card-fade-in" style={animDelay ? { animationDelay: animDelay } : {}}>
                    {isNew && <span className="badge-new">جديد</span>}
                    <div className="resource-meta">
                      <span className="resource-type-tag">{icon} {r.type} | ⏱️ {r.duration ?? '—'} د</span>
                      <span className="resource-difficulty-stars">{stars}</span>
                    </div>
                    <h4 className="resource-title">{r.title}</h4>
                    {r.description && <p className="resource-desc">{r.description}</p>}
                    <div className="resource-actions">
                      {safeLink !== '#' && (
                        <a href={safeLink} target="_blank" rel="noopener noreferrer" className="card-action-btn secondary-btn">فتح المورد</a>
                      )}
                      {safeCloud !== '#' && (
                        <a href={safeCloud} target="_blank" rel="noopener noreferrer" className="card-action-btn primary-btn">☁️ تشغيل سحابي</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="load-more-container">
                <button onClick={() => setPage(p => p + 1)} className="load-more-btn">
                  <i className="fa-solid fa-angles-down"></i>
                  <span>تحميل المزيد من الموارد</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {videoModal && (
        <VideoModal videoId={videoModal.id} title={videoModal.title} onClose={() => setVideoModal(null)} />
      )}
    </>
  );
}
