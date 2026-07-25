import { useToast } from '@/contexts/ToastContext';

interface Prompt {
  icon: string;
  iconColor: string;
  title: string;
  text: string;
}

const prompts: Prompt[] = [
  {
    icon: 'fa-bug',
    iconColor: 'var(--danger)',
    title: 'تصحيح الأخطاء البرمجية الفوري',
    text: 'لقد ظهرت لي رسالة الخطأ التالية عند تشغيل الكود: [الصق رسالة الخطأ هنا]. الكود المستخدم هو: [الصق الكود هنا]. اشرح لي بلغة بسيطة سبب حدوث هذا الخطأ تحديداً من الناحية المنطقية، ثم أعطني الحل البرمجي خطوة بخطوة، مع توضيح كيف أتجنبه مستقبلاً لتأمين كفاءة الذاكرة.'
  },
  {
    icon: 'fa-wand-magic-sparkles',
    iconColor: 'var(--secondary)',
    title: 'من الفكرة إلى النموذج الأولي (MVP)',
    text: 'أنت مهندس واجهات خبير. صمم لي [صف فكرتك بدقة: مثلاً لوحة تحكم مالية مصغرة] باستخدام HTML و Tailwind CSS و JavaScript الحديث في ملف واحد متكامل. اعتمد على تصميم عصري نظيف متجاوب بالكامل مع كافة الشاشات، واستخدم نظام ألوان مريح وأنيق. اعرض الكود البرمجي مباشرة دون مقدمات إنشائية مطولة.'
  },
  {
    icon: 'fa-graduation-cap',
    iconColor: '#a855f7',
    title: 'التفكيك المفاهيمي وعلم الخوارزميات',
    text: 'توقف عندي عند هذا السطر البرمجي / المفهوم الرياضي تحديداً ولا تكمل: [الصق السطر أو الدالة الخوارزمية هنا]. اشرح لي ماذا يفعل هذا السطر من حيث المنطق والعمليات الخلفية، ولماذا نستخدم هذه المنهجية دون غيرها، مع إعطائي مثالاً فيزيائياً مبسطاً من الحياة اليومية لترسيخ المفهوم في الذهن.'
  }
];

export function PromptCards() {
  const { showToast } = useToast();

  const copyPrompt = async (text: string, btn: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 تم نسخ البرومبت الهندسي بنجاح! الصقه الآن في محادثتك مع Claude.');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check-double"></i> <span>تم النسخ!</span>';
      (btn as any)._originalStyle = btn.style.cssText;
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.cssText = (btn as any)._originalStyle || '';
      }, 2500);
    } catch {
      showToast('❌ عذراً، تعذر الوصول لـ Clipboard. يرجى التحديد والنسخ يدوياً.', true);
    }
  };

  return (
    <section className="prompts-section">
      <div className="prompts-title-area">
        <h2 className="prompts-main-title">
          <i className="fa-solid fa-robot" style={{ color: 'var(--secondary)' }}></i> مستشارك الذكي في الهندسة والأكاديميا
        </h2>
        <p className="prompts-subtitle">قوالب برومبت متقدمة جاهزة للاستخدام؛ انسخ القالب، الصقه في محادثتك مع Claude، وعدّل ما بين الأقواس المربعة [ ].</p>
      </div>

      <div className="prompts-grid">
        {prompts.map((p, i) => (
          <div key={i} className="prompt-card">
            <h4 className="prompt-header">
              <i className={`fa-solid ${p.icon}`} style={{ color: p.iconColor }}></i> {p.title}
            </h4>
            <p className="prompt-text">{p.text}</p>
            <button
              onClick={(e) => copyPrompt(p.text, e.currentTarget)}
              className="prompt-copy-btn"
            >
              <i className="fa-regular fa-copy"></i> <span>نسخ البرومبت الهندسي</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
