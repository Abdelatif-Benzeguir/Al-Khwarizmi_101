import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function WaitingPage() {
  return (
    <section className="waiting-overlay">
      <div className="waiting-card">
        <div className="waiting-icon">
          <i className="fa-solid fa-hourglass-half"></i>
        </div>
        <h2 className="waiting-title">حسابك قيد المراجعة الفردية ⏳</h2>
        <p className="waiting-desc">
          مرحباً بك في المنصة السحابية. تم استلام طلبك بنجاح، وحفاظاً على خصوصية النادي العلمي وجودة المخرجات،
          يرجى الانتظار حتى يتم تأكيد وقبول حسابك يدوياً من طرف الأستاذ المشرف.
        </p>
        <button onClick={() => signOut(auth)} className="logout-text-link">
          <i className="fa-solid fa-arrow-right-from-bracket"></i> إلغاء وتسجيل الخروج
        </button>
      </div>
    </section>
  );
}
