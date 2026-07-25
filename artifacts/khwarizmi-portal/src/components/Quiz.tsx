import { useState } from 'react';
import { notebookQuestions } from '@/lib/quizData';
import type { QuizQuestion } from '@/lib/types';
import { formatQuizText } from '@/lib/utils';

export function Quiz() {
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const startQuiz = (category: 'lectures' | 'codes') => {
    const pool = notebookQuestions[category];
    const q = pool[Math.floor(Math.random() * pool.length)];
    setActiveQuestion(q);
    setAnswered(null);
    setShowHint(false);
  };

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
  };

  const getOptClass = (idx: number) => {
    if (answered === null) return 'quiz-opt-btn';
    if (idx === activeQuestion!.correct) return 'quiz-opt-btn correct';
    if (idx === answered && idx !== activeQuestion!.correct) return 'quiz-opt-btn incorrect';
    return 'quiz-opt-btn';
  };

  return (
    <div className="quiz-card">
      <h3 className="quiz-title">
        <i className="fa-solid fa-brain animate-pulse"></i> اختبار البيانات الذاتي (NotebookLM Style)
      </h3>
      <p className="quiz-desc">اختبر مهاراتك بشكل تفاعلي وعملي. الأكواد البرمجية معروضة من اليسار لليمين للتوافق التام مع لغة بايثون.</p>

      <div className="quiz-action-row">
        <button onClick={() => startQuiz('lectures')} className="quiz-mode-btn">📚 أسئلة المحاضرات</button>
        <button onClick={() => startQuiz('codes')} className="quiz-mode-btn">🐍 منطق الأكواد</button>
      </div>

      {activeQuestion && (
        <div className="quiz-box">
          <div className="quiz-context">
            <i className="fa-solid fa-paste" style={{ fontSize: '10px', color: 'var(--primary)' }}></i>{' '}
            <strong>السياق المرجعي المباشر:</strong>{' '}
            <span dangerouslySetInnerHTML={{ __html: formatQuizText(activeQuestion.context) }} />
          </div>
          <div className="quiz-lbl-current">السؤال الحالي:</div>
          <div className="quiz-question" dangerouslySetInnerHTML={{ __html: formatQuizText(activeQuestion.question) }} />

          <div className="quiz-options">
            {activeQuestion.options.map((opt, idx) => (
              <button key={idx} className={getOptClass(idx)} onClick={() => handleAnswer(idx)}>
                <span className="quiz-opt-btn-label">{opt.substring(0, 2)}</span>
                <span style={{ flexGrow: 1, textAlign: 'right' }} dangerouslySetInnerHTML={{ __html: formatQuizText(opt.substring(3)) }} />
              </button>
            ))}
          </div>

          {activeQuestion.hint && (
            <div className="quiz-hint-container">
              <button onClick={() => setShowHint(v => !v)} className="quiz-hint-toggle-btn">
                <i className="fa-solid fa-lightbulb"></i>{' '}
                <span>{showHint ? 'إخفاء التلميح المساعد' : 'إظهار التلميح المساعد (Hint)'}</span>
              </button>
              {showHint && (
                <div className="quiz-hint-text" dangerouslySetInnerHTML={{ __html: formatQuizText(activeQuestion.hint!) }} />
              )}
            </div>
          )}

          {answered !== null && (
            <div className={`quiz-feedback ${answered === activeQuestion.correct ? 'correct' : 'incorrect'}`}>
              {answered === activeQuestion.correct ? (
                <>
                  <i className="fa-solid fa-square-check" style={{ marginTop: '0.1rem' }}></i>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>That's right!</strong>
                    <span dangerouslySetInnerHTML={{ __html: formatQuizText(activeQuestion.explanation) }} />
                  </div>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-xmark" style={{ marginTop: '0.1rem' }}></i>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>محاولة غير موفقة منطقياً</strong>
                    عد لقراءة السياق البرمجي بتركيز، أو راجع الأستاذ المشرف لتفكيك الخوارزمية معاً بشكل أعمق.
                  </div>
                </>
              )}
            </div>
          )}

          {answered !== null && (
            <button
              onClick={() => { setAnswered(null); setShowHint(false); setActiveQuestion(null); }}
              className="quiz-mode-btn"
              style={{ marginTop: '0.75rem', width: '100%' }}
            >
              <i className="fa-solid fa-rotate-right"></i> سؤال جديد
            </button>
          )}
        </div>
      )}
    </div>
  );
}
