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

interface ChatProps {
  defaultCohort: string;
  showRoomSelector: boolean;
}

export function Chat({ defaultCohort, showRoomSelector }: ChatProps) {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [cohort, setCohort] = useState(defaultCohort);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [cohort]);

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
    <section>
      <div className="chat-container">
        <div className="chat-header">
          <h3 className="chat-header-title">
            <i className="fa-solid fa-comments"></i>
            <span>نقاش ومتابعة مشاريع: {cohort}</span>
          </h3>
          {showRoomSelector && (
            <select
              value={cohort}
              onChange={e => setCohort(e.target.value)}
              className="brand-input brand-select chat-room-select"
            >
              <option value="فوج الذكور">💬 دردشة فوج الذكور</option>
              <option value="فوج الإناث">💬 دردشة فوج الإناث</option>
            </select>
          )}
        </div>

        {pinnedMsg && (
          <div className="chat-pinned-banner">
            <i className="fa-solid fa-thumbtack" style={{ marginTop: '0.15rem' }}></i>
            <div style={{ flexGrow: 1, paddingRight: '0.25rem' }}>
              <strong className="pinned-lbl">تعليمات الأستاذ المشرف: </strong>
              <span dangerouslySetInnerHTML={{ __html: formatQuizText(pinnedMsg.text) }} />
            </div>
            {userData.role === 'teacher' && (
              <button onClick={unpinMessage} className="chat-unpin-btn" title="إلغاء التثبيت">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        <div className="chat-messages-area">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '2rem' }}>
              <i className="fa-solid fa-circle-notch animate-spin" style={{ display: 'block', fontSize: '24px', color: 'var(--primary)', marginBottom: '0.5rem' }}></i>
              جاري المزامنة مع السحابة...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '2rem' }}>
              لا توجد رسائل بعد. كن أول من يطرح فكرة أو استفسار!
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
                        <button onClick={() => pinMessage(msg.id)} className="chat-msg-action-btn pin-msg-btn" aria-label="تثبيت الرسالة" title="تثبيت الرسالة">
                          <i className="fa-solid fa-thumbtack"></i>
                        </button>
                      )}
                      {(userData.role === 'teacher' || isMe) && (
                        <button onClick={() => setDeleteTarget(msg.id)} className="chat-msg-action-btn" aria-label="حذف الرسالة" title="حذف الرسالة">
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

        <form onSubmit={sendMessage} className="chat-footer">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            required
            placeholder="اكتب رسالتك، استفسارك، أو الكود هنا..."
            className="brand-input"
            maxLength={500}
          />
          <button type="submit" className="chat-send-btn" aria-label="إرسال رسالة" disabled={!text.trim()}>
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
    </section>
  );
}
