import { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, writeBatch, getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal } from './ConfirmModal';
import { getFirebaseErrorMessage, formatQuizText } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

interface ChatPopupProps {
  defaultCohort: string;
  showRoomSelector: boolean;
}

export function ChatPopup({ defaultCohort, showRoomSelector }: ChatPopupProps) {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [cohort, setCohort] = useState(defaultCohort);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'messages'), where('cohort', '==', cohort));
    const unsub = onSnapshot(q, (snap) => {
      const docs: ChatMessage[] = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() } as ChatMessage));
      docs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(docs);
      setPinnedMsg(docs.find(m => m.isPinned) || null);
      setLoading(false);
      if (!open) {
        setUnreadCount(prev => {
          const newTotal = docs.length;
          const diff = newTotal - lastSeenCount;
          return diff > 0 ? diff : prev;
        });
      } else {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }, () => setLoading(false));
    return () => unsub();
  }, [cohort]);

  // When chat opens: clear badge, scroll, focus input
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      setLastSeenCount(messages.length);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !userData) return;
    if (trimmed.length > 500) { showToast('الرسالة طويلة جداً (الحد الأقصى 500 حرف).', true); return; }
    setText('');
    try {
      await addDoc(collection(db, 'messages'), {
        cohort, text: trimmed,
        senderUid: userData.uid, senderName: userData.name,
        senderRole: userData.role,
        timestamp: serverTimestamp(), isPinned: false
      });
    } catch (err: any) {
      setText(trimmed);
      showToast(getFirebaseErrorMessage(err.code) || 'خطأ في إرسال الرسالة.', true);
    }
  };

  const pinMessage = async (msgId: string) => {
    if (userData?.role !== 'teacher') return;
    try {
      const q2 = query(collection(db, 'messages'), where('cohort', '==', cohort), where('isPinned', '==', true));
      const snap = await getDocs(q2);
      const batch = writeBatch(db);
      snap.forEach(d => batch.update(d.ref, { isPinned: false }));
      batch.update(doc(db, 'messages', msgId), { isPinned: true });
      await batch.commit();
      showToast('📌 تم تثبيت التعليمة بنجاح');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const unpinMessage = async () => {
    if (!pinnedMsg || userData?.role !== 'teacher') return;
    try {
      await updateDoc(doc(db, 'messages', pinnedMsg.id), { isPinned: false });
      showToast('تم إلغاء تثبيت التعليمة');
    } catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  const deleteMessage = async (msgId: string) => {
    try { await deleteDoc(doc(db, 'messages', msgId)); }
    catch (err: any) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
  };

  if (!userData) return null;

  return (
    <>
      {/* Floating button */}
      <button
        className={`chat-fab ${open ? 'chat-fab-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'إغلاق الدردشة' : 'فتح الدردشة'}
        title={open ? 'إغلاق الدردشة' : 'نقاشات الفوج'}
      >
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-comments'}`}></i>
        {!open && unreadCount > 0 && (
          <span className="chat-fab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Backdrop */}
      {open && <div className="chat-backdrop" onClick={() => setOpen(false)} />}

      {/* Popup Panel */}
      <div className={`chat-popup ${open ? 'chat-popup-open' : ''}`} role="dialog" aria-label="دردشة الفوج" aria-modal="true">
        {/* Header */}
        <div className="chat-popup-header">
          <div className="chat-popup-title">
            <div className="chat-popup-title-icon">
              <i className="fa-solid fa-comments"></i>
            </div>
            <div>
              <span className="chat-popup-title-text">نقاشات ومتابعة المشاريع</span>
              <span className="chat-popup-cohort-lbl">{cohort}</span>
            </div>
          </div>
          <div className="chat-popup-header-actions">
            {showRoomSelector && (
              <select
                value={cohort}
                onChange={e => setCohort(e.target.value)}
                className="brand-input brand-select chat-room-select"
              >
                <option value="فوج الذكور">💬 فوج الذكور</option>
                <option value="فوج الإناث">💬 فوج الإناث</option>
              </select>
            )}
            <button onClick={() => setOpen(false)} className="chat-popup-close" aria-label="إغلاق">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Pinned Banner */}
        {pinnedMsg && (
          <div className="chat-pinned-banner">
            <i className="fa-solid fa-thumbtack" style={{ marginTop: '0.15rem', color: 'var(--secondary)' }}></i>
            <div style={{ flexGrow: 1, paddingRight: '0.25rem', fontSize: '11px' }}>
              <strong className="pinned-lbl">تعليمات الأستاذ: </strong>
              <span dangerouslySetInnerHTML={{ __html: formatQuizText(pinnedMsg.text) }} />
            </div>
            {userData.role === 'teacher' && (
              <button onClick={unpinMessage} className="chat-unpin-btn" title="إلغاء التثبيت">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages-area">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '2rem' }}>
              <i className="fa-solid fa-circle-notch animate-spin" style={{ display: 'block', fontSize: '22px', color: 'var(--primary)', marginBottom: '0.5rem' }}></i>
              جاري المزامنة...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '3rem', lineHeight: 1.7 }}>
              <i className="fa-regular fa-comment-dots" style={{ display: 'block', fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--border)' }}></i>
              لا توجد رسائل بعد.<br />كن أول من يطرح فكرة!
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderUid === userData.uid;
              const isTeacher = msg.senderRole === 'teacher';
              const classes = ['chat-msg-wrapper', isMe ? 'self' : 'other', isTeacher ? 'teacher' : ''].filter(Boolean).join(' ');
              return (
                <div key={msg.id} className={classes}>
                  <span className="chat-msg-header">
                    <span>
                      {isTeacher && <i className="fa-solid fa-user-shield" style={{ fontSize: '9px', color: 'var(--secondary)', marginLeft: '2px' }}></i>}
                      {isMe ? 'أنت' : msg.senderName || 'عضو في النادي'}
                    </span>
                    <span className="chat-msg-actions">
                      {userData.role === 'teacher' && !msg.isPinned && (
                        <button onClick={() => pinMessage(msg.id)} className="chat-msg-action-btn pin-msg-btn" aria-label="تثبيت">
                          <i className="fa-solid fa-thumbtack"></i>
                        </button>
                      )}
                      {(userData.role === 'teacher' || isMe) && (
                        <button onClick={() => setDeleteTarget(msg.id)} className="chat-msg-action-btn" aria-label="حذف">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      )}
                    </span>
                  </span>
                  <div className="chat-msg-bubble" dangerouslySetInnerHTML={{ __html: formatQuizText(msg.text) }} />
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <form onSubmit={sendMessage} className="chat-footer">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            required
            placeholder="اكتب رسالتك أو استفسارك..."
            className="brand-input"
            maxLength={500}
            autoComplete="off"
          />
          <button type="submit" className="chat-send-btn" aria-label="إرسال" disabled={!text.trim()}>
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="حذف الرسالة"
        message="هل أنت متأكد من حذف هذه الرسالة نهائياً؟"
        confirmText="حذف"
        danger
        onConfirm={() => { if (deleteTarget) deleteMessage(deleteTarget); }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
