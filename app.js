/* ============================================================
   منطق التحكم والربط البرمجي السحابي لمنصة نادي الخوارزمي العلمي (app.js)
   ============================================================ */

"use strict";

/* ============================================================
   التهيئة والاتصال بـ Firebase
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDuO1s1CeJyYz7OZZiFbcjoGeaxSChK7lA",
  authDomain: "al-khwarizmi-101.firebaseapp.com",
  projectId: "al-khwarizmi-101",
  storageBucket: "al-khwarizmi-101.firebasestorage.app",
  messagingSenderId: "1019788624534",
  appId: "1:1019788624534:web:f8aa7497b2c790d679f8b7",
  measurementId: "G-P62EKG451Y"
};

const TEACHER_EMAIL = "ltfbenzeguir@gmail.com";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ============================================================
   الحالة العامة للتطبيق (Global App State)
   ============================================================ */
let currentUserData = null, authMode = 'login', currentFilter = 'الكل', allResources = [], allStudents = [];
let editingResourceId = null;
let resourcesFirstLoad = true;
let studentsFirstLoad = true;
let gradeChart = null;
let cohortChart = null;

// متغيرات نظام الدردشة
let currentChatCohort = '';
let chatUnsubscribe = null;
let pinnedMessageId = null;

// دوال إلغاء الاشتراك من مستمعي Firestore الحية (onSnapshot)
let unsubUserDoc = null;
let unsubResources = null;
let unsubStudents = null;
let unsubSuggestions = null;
let unsubPendingUsers = null;

const typeIcons = {
  'محاضرة': '📚',
  'فيديو': '🎥',
  'كود بايثون': '🐍',
  'برومبت': '💬',
  'مصطلح': '📖'
};

const notebookQuestions = {
  lectures: [
    {
      context: "الحصة الأولى: روبوتات المحادثة المعاصرة مثل Claude لا 'تفكر' كالبشر، بل تعتمد على نماذج لغوية ضخمة (LLMs) تتنبأ بالكلمة التالية بناءً على احتمالات إحصائية مستمدة من بيانات التدريب.",
      question: "إذا سألت الذكاء الاصطناعي عن حقيقة دقيقة جداً وغير موجودة في بيانات تدريبه، ما هو التفسير المنطقي الأرجح لظاهرة الهلوسة (`Hallucination`) التي قد تحدث؟",
      options: [
        "A. يحاول النموذج إرضاء المستخدم بتوليد نص يبدو لغوياً ومنطقياً صحيحاً بناءً على الاحتمالات، رغم كونه خاطئاً واقعياً.",
        "B. يقوم النموذج بالبحث العشوائي في الإنترنت ولكنه يفشل في ترجمة المعلومات المعروضة.",
        "C. تتوقف الشبكة العصبية تماماً عن العمل وتصدر رموزاً غير مفهومة كرسالة خطأ حرج."
      ],
      correct: 0,
      hint: "تذكر دائماً أن النماذج اللغوية مبنية لتوليد نصوص متناسقة ومقنعة (Generative) وليست محركات بحث تقليدية تطابق البيانات بالضرورة.",
      explanation: "إجابة دقيقة! النماذج اللغوية مصممة بالأساس لتوليد نصوص متسلسلة لغوياً، وليست قواعد بيانات بحثية صلبة. غياب المعلومة يجعلها تعتمد على أقرب سياق احتمالي لتكوين إجابة تبدو مقنعة للمستخدم."
    },
    {
      context: "الحصة الثانية: كتب أحد الطلاب البرومبت التالي: 'اكتب لي مقالاً عن الذكاء الاصطناعي'. فكانت النتيجة مقالاً عاماً جداً لا يناسب تطلعات مستوى النادي العلمي.",
      question: "وفقاً لقواعد هندسة البرومبتات (`Prompt Engineering`) المتقدمة، ما هو العنصر الأهم المفقود في هذا الأمر البرمي للحصول على مخرجات احترافية ودقيقة؟",
      options: [
        "A. تحديد عدد الكلمات بدقة مسبقة (مثال: 500 كلمة فقط).",
        "B. كتابة البرومبت باللغة الإنجليزية حصراً لتفادي مشاكل الفهم.",
        "C. تحديد الدور (`Persona`)، الجمهور المستهدف، والقيود الهيكلية والسياق المطلوب."
      ],
      correct: 2,
      hint: "النموذج يحتاج إلى معرفة 'من هو' و'لمن يكتب' لكي يحيك الإجابة بدقة متناهية.",
      explanation: "ممتاز! السر في هندسة الأوامر هو 'السياق والمحددات'. إعطاء النموذج دوراً (مثل: أنت خبير أكاديمي)، وتحديد الجمهور (لطلاب هندسة)، ووضع قيود هيكلية هو ما يصنع الفارق بين الإجابة العادية والاحترافية."
    }
  ],
  codes: [
    {
      context: "الحصة الرابعة: تريد مراجعة وتعديل كود بايثون تظهر فيه دالة الإخراج الأساسية والشائعة.",
      question: "كما هو موضح في التمرين الأول من المادة المصدر؛ ما هي الوظيفة الأساسية لدالة `print()`؟",
      options: [
        "A. استقبال مدخلات نصية أو رقمية مباشرة من المستخدم عبر لوحة المفاتيح.",
        "B. تنفيذ عملية حسابية معقدة وتخزين نتيجتها في الذاكرة المؤقتة للبرنامج.",
        "C. عرض أو طباعة النتائج والمخرجات أو النصوص على الشاشة للمستخدم."
      ],
      correct: 2,
      hint: "هذه الدالة هي أداة الإخراج الأساسية في بايثون، وتستخدم لإظهار المعلومات للمستخدم بشكل مباشر على الكونسول.",
      explanation: "That's right! هذه الدالة هي أداة الإخراج القياسية والأساسية في لغة بايثون، وتستخدم لإظهار البيانات والمعلومات المرجعية للمستخدم على الشاشة."
    },
    {
      context: "الحصة الرابعة: قمت بتعريف مقتطف برمجي بسيط في بايثون لتخزين أعداد المشاركين في النادي العلمي.",
      question: "ماذا يمثل المعرف `students` في مقتطف الكود التالي: `students = 25`؟",
      options: [
        "A. متغير (`Variable`) يُسخدم لحفظ وتخزين القيمة العددية 25 في الذاكرة.",
        "B. دالة مدمجة (`Built-in Function`) لعرض الأرقام على الشاشة.",
        "C. سلسلة نصية (`String`) ثابتة لا يمكن تغيير قيمتها أثناء تشغيل البرنامج."
      ],
      correct: 0,
      hint: "هذا العنصر يُستخدم لحفظ قيم معينة بحيث يمكن الرجوع إليها واستخدامها أو تعديلها لاحقاً في البرمجية.",
      explanation: "تحليل برمجي سليم تماماً! علامة `=` تسمى عامل الإسناد (Assignment Operator) وتستخدم لتعيين وتخزين القيم البرمجية داخل المتغيرات لسهولة استدعائها."
    },
    {
      context: "الحصة الخامسة (فوج الإناث): أثناء إعداد مساحة العمل والربط البرمجي السحابي لبوت المحادثة التفاعلي، ظهر لك الخطأ التالي: `ModuleNotFoundError: No module named Flask`.",
      question: "من الناحية الهيكلية لإدارة بيئة التطوير المحلية، ماذا يعني هذا الخطأ تحديداً وكيف تتجاوزه؟",
      options: [
        "A. الكود يحتوي على خطأ في بناء دالة الاستجابة ويجب استخدام مكتبة أخرى.",
        "B. البيئة الحالية تفتقر إلى المكتبة الخارجية المطلوبة، ويجب تثبيتها عبر أمر مدير الحزم: `pip install flask`.",
        "C. لغة بايثون لا تدعم برمجياً تشغيل الـ Web Servers محلياً."
      ],
      correct: 1,
      hint: "مدير الحزم `pip` هو الأداة الرسمية المسؤولة عن جلب الحزم والمكتبات الخارجية وتثبيتها في بيئتك.",
      explanation: "إجابة هندسية ممتازة! الحزم الخارجية مثل Flask أو Streamlit لا تأتي مدمجة مع بايثون بشكل افتراضي، لذا يتعين تهيئة البيئة وتثبيتها عبر مدير الحزم أولاً لتأمين دمج التعليمات."
    }
  ]
};

/* ============================================================
   أدوات مساعدة عامة (Utilities)
   ============================================================ */

// تحويل أي نص خارجي إلى نص آمن قبل إدراجه في HTML (منع XSS)
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// تنظيف وتأمين الروابط الخارجية
function sanitizeURL(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (trimmed === '' || trimmed === '#') return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '#';
}

// دالة تأخير التنفيذ (Debounce) للبحث
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ترجمة أخطاء Firebase
function getFirebaseErrorMessage(code) {
  const map = {
    'auth/wrong-password': 'كلمة المرور غير صحيحة، حاول مجدداً.',
    'auth/user-not-found': 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل مسبقاً، جرّب تسجيل الدخول بدلاً من ذلك.',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً، يجب أن تحتوي على 6 خانات على الأقل.',
    'auth/too-many-requests': 'عدد كبير من المحاولات الفاشلة، يرجى الانتظار قليلاً ثم إعادة المحاولة.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/missing-password': 'يرجى كتابة كلمة المرور.',
    'auth/network-request-failed': 'تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت.',
    'permission-denied': 'ليست لديك صلاحية القيام بهذا الإجراء.'
  };
  return (code && map[code]) || null;
}

function showAuthError(message) {
  const box = document.getElementById('authErrorBox');
  document.getElementById('authErrorText').textContent = message;
  box.classList.remove('hidden');
  box.classList.add('flex');
}

function hideAuthError() {
  const box = document.getElementById('authErrorBox');
  box.classList.add('hidden');
  box.classList.remove('flex');
}

/* ============================================================
   نظام النوافذ المنبثقة المخصص (Custom Modal)
   ============================================================ */
function showConfirmModal({ title, message, confirmText = 'تأكيد', danger = false, onConfirm }) {
  const overlay = document.getElementById('customModalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;

  const iconWrap = document.getElementById('modalIconWrap');
  iconWrap.className = `modal-icon-wrapper ${danger ? 'modal-icon-danger' : 'modal-icon-primary'}`;
  iconWrap.innerHTML = `<i class="fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>`;

  const confirmBtn = document.getElementById('modalConfirmBtn');
  confirmBtn.textContent = confirmText;
  confirmBtn.className = `modal-btn ${danger ? 'table-btn-danger' : 'table-btn'}`;
  confirmBtn.style.padding = "0.65rem";
  confirmBtn.onclick = () => { closeModal(); onConfirm && onConfirm(); };

  overlay.classList.add('show');
}

function closeModal() {
  document.getElementById('customModalOverlay').classList.remove('show');
}

// منسق الأكواد LTR
function formatQuizText(text) {
  if (!text) return '';
  const safeText = escapeHTML(text);
  return safeText.replace(/`([^`]+)`/g, '<span class="ltr-code-inline" dir="ltr">$1</span>');
}

// دالة تبديل المظهر الداكن/الفاتح
function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-sun text-amber-500' : 'fa-solid fa-moon';
  if (currentUserData && currentUserData.role === 'teacher') renderAnalyticsCharts();
}

// التحقق من الأيقونة عند التحميل
window.addEventListener('DOMContentLoaded', () => {
  const isDark = document.documentElement.classList.contains('dark');
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = isDark ? 'fa-solid fa-sun text-amber-500' : 'fa-solid fa-moon';
});

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  const safeMsg = escapeHTML(msg);
  t.innerHTML = isError 
    ? `<i class="fa-solid fa-circle-exclamation text-rose-400"></i> ${safeMsg}` 
    : `<i class="fa-solid fa-circle-check text-emerald-400"></i> ${safeMsg}`;
  
  t.className = `toast-box show ${isError ? 'toast-error' : 'toast-success'}`;
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => {
    t.className = "toast-box";
  }, 3500);
}

/* ============================================================
   المصادقة (Authentication)
   ============================================================ */
function toggleAuthMode(mode) {
  authMode = mode;
  hideAuthError();
  document.getElementById('registerFields').classList.toggle('hidden', mode === 'login');
  document.getElementById('authTitle').textContent = mode === 'login' ? 'بوابة الدخول الآمنة' : 'إنشاء طلب انضمام جديد';
  document.getElementById('authSubmitBtn').querySelector('span').textContent = mode === 'login' ? 'دخول للمنصة' : 'إرسال طلب الانضمام الفوري للأستاذ';
  document.getElementById('forgotPasswordBtn').classList.toggle('hidden', mode !== 'login');
  document.getElementById('tabLogin').className = mode === 'login' ? 'auth-tab-btn active' : 'auth-tab-btn';
  document.getElementById('tabRegister').className = mode === 'register' ? 'auth-tab-btn active' : 'auth-tab-btn';
}
window.toggleAuthMode = toggleAuthMode;

function setAuthLoading(isLoading) {
  const btn = document.getElementById('authSubmitBtn');
  btn.disabled = isLoading;
  if (isLoading) btn.dataset.originalHtml = btn.innerHTML;
  btn.innerHTML = isLoading
    ? '<i class="fa-solid fa-spinner fa-spin"></i> <span>جارٍ التحقق...</span>'
    : (btn.dataset.originalHtml || btn.innerHTML);
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  hideAuthError();

  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !password) {
    showAuthError('يرجى تعبئة البريد الإلكتروني وكلمة المرور.');
    return;
  }

  try {
    if (authMode === 'login') {
      setAuthLoading(true);
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      const name = document.getElementById('authName').value.trim();
      const cohort = document.getElementById('authCohort').value;
      const team = document.getElementById('authTeam').value;

      if (!name || name.split(/\s+/).length < 2) {
        showAuthError('يرجى كتابة الاسم الثلاثي الكامل أولاً لتسهيل المراجعة.');
        return;
      }
      if (password.length < 6) {
        showAuthError('كلمة المرور يجب أن تحتوي على 6 خانات على الأقل.');
        return;
      }

      setAuthLoading(true);
      const isTeacher = (email.toLowerCase() === TEACHER_EMAIL.toLowerCase());
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        uid: cred.user.uid,
        name: isTeacher ? "الأستاذ المشرف العام" : name,
        email: email,
        cohort: isTeacher ? "إدارة النادي" : cohort,
        team: isTeacher ? "المشرف العام والأكاديمي" : team,
        approved: isTeacher ? true : false,
        role: isTeacher ? 'teacher' : 'student',
        python: 0,
        hackathon: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('تم إرسال ملف حسابك للأستاذ بنجاح للتحقق والموافقة يدوياً');
    }
  } catch (err) {
    showAuthError(getFirebaseErrorMessage(err.code) || ('فشل التحقق والأمان: ' + err.message));
  } finally {
    setAuthLoading(false);
  }
}
window.handleAuthSubmit = handleAuthSubmit;

function handleForgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  if (!email) {
    showAuthError('يرجى كتابة بريدك الإلكتروني أولاً في الحقل أعلاه، ثم اضغط "نسيت كلمة المرور؟".');
    return;
  }
  auth.sendPasswordResetEmail(email).then(() => {
    hideAuthError();
    showToast('📧 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
  }).catch(err => showAuthError(getFirebaseErrorMessage(err.code) || err.message));
}
window.handleForgotPassword = handleForgotPassword;

auth.onAuthStateChanged(user => {
  if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }

  if (user) {
    document.getElementById('authSection').classList.add('hidden');
    if (user.email.toLowerCase() === TEACHER_EMAIL.toLowerCase()) {
      db.collection('users').doc(user.uid).set({ uid: user.uid, email: user.email, role: 'teacher', approved: true }, { merge: true });
    }
    unsubUserDoc = db.collection('users').doc(user.uid).onSnapshot(doc => {
      if (doc.exists) {
        currentUserData = doc.data();
        if (!currentUserData.approved) {
          document.getElementById('waitingSection').classList.remove('hidden');
          document.getElementById('appContainer').classList.add('hidden');
        } else {
          document.getElementById('waitingSection').classList.add('hidden');
          document.getElementById('appContainer').classList.remove('hidden');
          setupAppView();
        }
      }
    });
  } else {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('waitingSection').classList.add('hidden');
    document.getElementById('appContainer').classList.add('hidden');
  }
});

function confirmLogout() {
  showConfirmModal({
    title: 'تسجيل الخروج',
    message: 'هل تريد فعلاً تسجيل الخروج من بوابة النادي؟',
    confirmText: 'تسجيل الخروج',
    danger: false,
    onConfirm: logout
  });
}
window.confirmLogout = confirmLogout;

function logout() {
  [unsubResources, unsubStudents, unsubSuggestions, unsubPendingUsers, chatUnsubscribe].forEach(fn => fn && fn());
  unsubResources = unsubStudents = unsubSuggestions = unsubPendingUsers = chatUnsubscribe = null;
  allResources = []; allStudents = [];
  resourcesFirstLoad = true; studentsFirstLoad = true;
  editingResourceId = null;
  auth.signOut();
}

function setupAppView() {
  document.getElementById('userBadge').innerHTML = `<i class="fa-solid fa-user-shield" style="font-size: 10px; color: var(--primary);"></i> ${escapeHTML(currentUserData.name)} | <span style="font-weight: 500; color: var(--text-secondary);">${escapeHTML(currentUserData.cohort)}</span>`;
  const gradesCard = document.getElementById('personalGradesCard');

  document.getElementById('chatSectionContainer').classList.remove('hidden');

  if (currentUserData.role === 'teacher') {
    document.getElementById('btnTeacherRole').classList.remove('hidden');
    gradesCard.classList.add('hidden');

    document.getElementById('teacherChatSelector').classList.remove('hidden');
    document.getElementById('teacherChatSelector').value = 'فوج الذكور';
    switchChatRoom('فوج الذكور');

    listenToTeacherData();
    listenToSuggestions();
  } else {
    document.getElementById('btnTeacherRole').classList.add('hidden');
    gradesCard.classList.remove('hidden');
    document.getElementById('myPython').textContent = currentUserData.python || 0;
    document.getElementById('myHackathon').textContent = currentUserData.hackathon || 0;
    document.getElementById('myAverage').textContent = (((currentUserData.python || 0) + (currentUserData.hackathon || 0)) / 2).toFixed(1);

    document.getElementById('teacherChatSelector').classList.add('hidden');
    switchChatRoom(currentUserData.cohort);

    switchRole('student');
  }
  listenToResources();
  listenToStudents();
}

function switchRole(role) {
  document.getElementById('studentView').classList.toggle('hidden', role !== 'student');
  document.getElementById('teacherView').classList.toggle('hidden', role !== 'teacher');
  document.getElementById('btnStudentRole').classList.toggle('active', role === 'student');
  document.getElementById('btnTeacherRole').classList.toggle('active', role === 'teacher');
  document.getElementById('btnStudentRole').setAttribute('aria-selected', role === 'student');
  document.getElementById('btnTeacherRole').setAttribute('aria-selected', role === 'teacher');
}
window.switchRole = switchRole;

function listenToResources() {
  if (unsubResources) unsubResources();
  renderResources();
  unsubResources = db.collection('resources').onSnapshot(snap => {
    allResources = []; snap.forEach(d => allResources.push({ id: d.id, ...d.data() }));
    resourcesFirstLoad = false;
    renderResources();
  }, err => {
    console.error(err);
    resourcesFirstLoad = false;
    showToast('تعذر تحميل الموارد التعليمية حالياً.', true);
  });
}

/* ============================================================
   نظام الدردشة المخصص للأفواج (فوج الذكور / فوج الإناث)
   ============================================================ */
function switchChatRoom(cohort) {
  currentChatCohort = cohort;
  document.getElementById('chatRoomTitle').textContent = `نقاش ومتابعة مشاريع: ${cohort}`;

  if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }

  const messagesArea = document.getElementById('chatMessagesArea');
  messagesArea.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 2rem;"><i class="fa-solid fa-circle-notch animate-spin" style="margin-bottom: 0.5rem; font-size: 24px; color: var(--primary);"></i><br>جاري المزامنة مع السحابة...</div>';

  chatUnsubscribe = db.collection('messages')
    .where('cohort', '==', cohort)
    .onSnapshot(snap => {
      let docs = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

      let pinnedMsg = null;
      const html = docs.map(msg => {
        if (msg.isPinned) pinnedMsg = msg;
        return renderMessage(msg);
      }).join('');

      messagesArea.innerHTML = html || '<div style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 2rem;">لا توجد رسائل بعد. كن أول من يطرح فكرة أو استفسار!</div>';
      messagesArea.scrollTop = messagesArea.scrollHeight;

      updatePinnedMessageUI(pinnedMsg);
    }, err => {
      console.error(err);
      messagesArea.innerHTML = '<div style="text-align: center; color: var(--danger); font-size: 12px; margin-top: 2rem; padding: 1rem;"><i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 0.5rem; font-size: 20px; display: block;"></i>تعذر تحميل الدردشة حالياً. تحقق من اتصالك بالإنترنت أو أعد المحاولة لاحقاً.</div>';
    });
}
window.switchChatRoom = switchChatRoom;

function renderMessage(msg) {
  const isMe = msg.senderUid === currentUserData.uid;
  const isTeacher = msg.senderRole === 'teacher';

  const wrapperClasses = ['chat-msg-wrapper'];
  if (isMe) wrapperClasses.push('self');
  else wrapperClasses.push('other');
  if (isTeacher) wrapperClasses.push('teacher');

  let actionsHTML = '';
  if (currentUserData.role === 'teacher' && !msg.isPinned) {
    actionsHTML += `<button onclick="pinMessage('${msg.id}')" class="chat-msg-action-btn pin-msg-btn" aria-label="تثبيت الرسالة" title="تثبيت الرسالة"><i class="fa-solid fa-thumbtack"></i></button>`;
  }
  if (currentUserData.role === 'teacher' || isMe) {
    actionsHTML += `<button onclick="confirmDeleteMessage('${msg.id}')" class="chat-msg-action-btn" aria-label="حذف الرسالة" title="حذف الرسالة"><i class="fa-solid fa-trash"></i></button>`;
  }

  const formattedText = formatQuizText(msg.text);
  const safeSenderName = escapeHTML(msg.senderName || 'عضو في النادي');

  return `
    <div class="${wrapperClasses.join(' ')}">
      <span class="chat-msg-header">
        <span>${isTeacher ? '<i class="fa-solid fa-user-shield" style="font-size: 9px; color: var(--secondary); margin-left: 2px;"></i> ' : ''}${isMe ? 'أنت' : safeSenderName}</span>
        <span class="chat-msg-actions">${actionsHTML}</span>
      </span>
      <div class="chat-msg-bubble">
        ${formattedText}
      </div>
    </div>
  `;
}

async function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatInputBox');
  const text = input.value.trim();
  if (!text) return;
  if (text.length > 500) { showToast('الرسالة طويلة جداً (الحد الأقصى 500 حرف).', true); return; }

  input.value = '';

  try {
    await db.collection('messages').add({
      cohort: currentChatCohort,
      text: text,
      senderUid: currentUserData.uid,
      senderName: currentUserData.name,
      senderRole: currentUserData.role,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      isPinned: false
    });
  } catch (err) {
    input.value = text;
    showToast(getFirebaseErrorMessage(err.code) || ('خطأ في إرسال الرسالة: ' + err.message), true);
  }
}
window.handleSendMessage = handleSendMessage;

async function pinMessage(msgId) {
  if (currentUserData.role !== 'teacher') return;
  try {
    const snap = await db.collection('messages').where('cohort', '==', currentChatCohort).where('isPinned', '==', true).get();
    const batch = db.batch();
    snap.forEach(doc => batch.update(doc.ref, { isPinned: false }));
    batch.update(db.collection('messages').doc(msgId), { isPinned: true });
    await batch.commit();
    showToast('📌 تم تثبيت التعليمة بنجاح في أعلى الدردشة');
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || err.message, true);
  }
}
window.pinMessage = pinMessage;

async function unpinMessage() {
  if (!pinnedMessageId || currentUserData.role !== 'teacher') return;
  try {
    await db.collection('messages').doc(pinnedMessageId).update({ isPinned: false });
    showToast('تم إلغاء تثبيت التعليمة');
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || err.message, true);
  }
}
window.unpinMessage = unpinMessage;

function confirmDeleteMessage(msgId) {
  showConfirmModal({
    title: 'حذف الرسالة',
    message: 'هل أنت متأكد من حذف هذه الرسالة نهائياً؟',
    confirmText: 'حذف',
    danger: true,
    onConfirm: async () => {
      try { await db.collection('messages').doc(msgId).delete(); }
      catch (err) { showToast(getFirebaseErrorMessage(err.code) || err.message, true); }
    }
  });
}

function updatePinnedMessageUI(msg) {
  const area = document.getElementById('pinnedMessageContainer');
  const textNode = document.getElementById('pinnedMessageText');
  const unpinBtn = document.getElementById('unpinMessageBtn');

  if (msg) {
    pinnedMessageId = msg.id;
    area.classList.remove('hidden');
    textNode.innerHTML = formatQuizText(msg.text);
    unpinBtn.classList.toggle('hidden', currentUserData.role !== 'teacher');
  } else {
    pinnedMessageId = null;
    area.classList.add('hidden');
  }
}

/* ============================================================
   نظام الاختبار التفاعلي (Notebook Quiz)
   ============================================================ */
let activeQuizData = null;

function initNotebookQuiz(category) {
  const box = document.getElementById('notebookQuizBox');
  const contextSpace = document.getElementById('quizQuestionContext');
  const questionSpace = document.getElementById('quizQuestionText');
  const optionsSpace = document.getElementById('quizOptionsSpace');
  const feedbackSpace = document.getElementById('quizFeedbackSpace');
  const hintContainer = document.getElementById('quizHintContainer');
  const hintTextSpace = document.getElementById('quizHintTextSpace');
  const toggleHintBtn = document.getElementById('toggleHintBtn');

  box.classList.remove('hidden');
  feedbackSpace.classList.add('hidden');
  optionsSpace.innerHTML = '';

  hintTextSpace.classList.add('hidden');
  toggleHintBtn.querySelector('span').innerText = "إظهار التلميح المساعد (Hint)";

  const pool = notebookQuestions[category];
  activeQuizData = pool[Math.floor(Math.random() * pool.length)];

  contextSpace.innerHTML = `<i class="fa-solid fa-paste" style="font-size: 10px; color: var(--primary);"></i> <strong>السياق المرجعي المباشر:</strong> ${formatQuizText(activeQuizData.context)}`;
  questionSpace.innerHTML = formatQuizText(activeQuizData.question);

  if (activeQuizData.hint) {
    hintContainer.classList.remove('hidden');
    hintTextSpace.innerHTML = formatQuizText(activeQuizData.hint);
  } else {
    hintContainer.classList.add('hidden');
  }

  activeQuizData.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = "quiz-opt-btn";

    btn.innerHTML = `
      <span class="quiz-opt-btn-label">${escapeHTML(opt.substring(0, 2))}</span>
      <span style="flex-grow: 1; text-align: right;">${formatQuizText(opt.substring(3))}</span>
    `;

    btn.onclick = () => {
      Array.from(optionsSpace.children).forEach(b => b.removeAttribute('onclick'));
      feedbackSpace.classList.remove('hidden');

      if (idx === activeQuizData.correct) {
        btn.className = "quiz-opt-btn correct";
        feedbackSpace.className = "quiz-feedback correct";
        feedbackSpace.innerHTML = `<div class="flex items-start gap-2"><i class="fa-solid fa-square-check text-[14px] mt-0.5 animate-bounce"></i> <div><strong class="block font-display mb-0.5">That's right!</strong>${formatQuizText(activeQuizData.explanation)}</div></div>`;
      } else {
        btn.className = "quiz-opt-btn incorrect";
        feedbackSpace.className = "quiz-feedback incorrect";
        feedbackSpace.innerHTML = `<div class="flex items-start gap-2"><i class="fa-solid fa-circle-xmark text-[14px] mt-0.5"></i> <div><strong class="block font-display mb-0.5">محاولة غير موفقة منطقياً</strong>عد لقراءة السياق البرمجي بتركيز، أو راجع الأستاذ المشرف لتفكيك الخوارزمية معاً بشكل أعمق.</div></div>`;
      }
    };
    optionsSpace.appendChild(btn);
  });
}
window.initNotebookQuiz = initNotebookQuiz;

function toggleQuizHint() {
  const hintTextSpace = document.getElementById('quizHintTextSpace');
  const toggleHintBtn = document.getElementById('toggleHintBtn');
  const isHidden = hintTextSpace.classList.contains('hidden');

  hintTextSpace.classList.toggle('hidden');
  toggleHintBtn.querySelector('span').innerText = isHidden ? "إخفاء التلميح المساعد" : "إظهار التلميح المساعد (Hint)";
}
window.toggleQuizHint = toggleQuizHint;

/* ============================================================
   الموارد التعليمية (Resources)
   ============================================================ */
function renderResources() {
  const grid = document.getElementById('resourcesGrid');

  if (resourcesFirstLoad) {
    grid.innerHTML = Array(3).fill(`
      <div class="resource-card">
        <div class="skeleton" style="height: 1rem; width: 50%;"></div>
        <div class="skeleton" style="height: 1.25rem; width: 75%; margin-top: 0.5rem;"></div>
        <div class="skeleton" style="height: 3rem; width: 100%; margin-top: 0.5rem;"></div>
        <div class="skeleton" style="height: 2.25rem; width: 100%; margin-top: 0.75rem;"></div>
      </div>`).join('');
    return;
  }

  const search = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allResources.filter(r => (currentFilter === 'الكل' || r.type === currentFilter) && (r.title || '').toLowerCase().includes(search));

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-box-open"></i></div>
        <h3 class="empty-state-title">لا توجد مواد أو برومبتات برمجية هنا حالياً</h3>
        <p class="empty-state-desc">حاول تعديل شروط البحث أو الفلتر للعثور على مستندات مغايرة.</p>
      </div>
    `;
    return;
  }

  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  grid.innerHTML = filtered.map(r => {
    if (editingResourceId === r.id) return renderResourceEditCard(r);

    const starRating = '⭐'.repeat(r.difficulty || 1);
    const icon = typeIcons[r.type] || '📄';
    const createdMs = r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : null;
    const isNew = createdMs && (now - createdMs) < THREE_DAYS;
    const safeLink = sanitizeURL(r.link);
    const safeCloudLink = r.cloudLink ? sanitizeURL(r.cloudLink) : '';

    return `
    <div class="resource-card">
      ${isNew ? `<span class="badge-new">جديد</span>` : ''}
      <div class="resource-meta">
        <span class="resource-type-tag">${icon} ${escapeHTML(r.type)} | ⏱️ ${escapeHTML(String(r.duration))} د</span>
        <span class="resource-difficulty-stars">${starRating}</span>
      </div>
      <h4 class="resource-title">${escapeHTML(r.title)}</h4>
      ${r.description ? `<p class="resource-desc">${escapeHTML(r.description)}</p>` : ''}
      <div class="resource-actions">
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="card-action-btn secondary-btn">فتح المورد</a>
        ${safeCloudLink ? `<a href="${safeCloudLink}" target="_blank" rel="noopener noreferrer" class="card-action-btn primary-btn">☁️ تشغيل سحابي</a>` : ''}
        ${currentUserData.role === 'teacher' ? `
          <button onclick="startEditResource('${r.id}')" aria-label="تعديل المورد" class="card-action-icon-btn"><i class="fa-solid fa-pen"></i></button>
          <button onclick="confirmDeleteResource('${r.id}')" aria-label="حذف المورد" class="card-action-icon-btn delete-btn"><i class="fa-solid fa-trash-can"></i></button>
        ` : ''}
      </div>
    </div>`;
  }).join('');
}

const debouncedRenderResources = debounce(renderResources, 300);
window.debouncedRenderResources = debouncedRenderResources;

function renderResourceEditCard(r) {
  return `
  <div class="resource-edit-card">
    <input type="text" id="edit_title_${r.id}" value="${escapeHTML(r.title)}" class="brand-input" style="font-weight: 700;" placeholder="العنوان" maxlength="120">
    <textarea id="edit_desc_${r.id}" class="brand-input" rows="2" maxlength="240" placeholder="وصف مختصر (اختياري)">${escapeHTML(r.description || '')}</textarea>
    <div class="input-row">
      <input type="url" id="edit_link_${r.id}" value="${escapeHTML(r.link || '')}" class="brand-input" placeholder="الرابط">
      <input type="url" id="edit_cloud_${r.id}" value="${escapeHTML(r.cloudLink || '')}" class="brand-input" placeholder="رابط سحابي">
    </div>
    <div class="input-row" style="margin-top: 0.5rem;">
      <button onclick="saveEditResource('${r.id}')" class="submit-btn" style="margin: 0; padding: 0.5rem;">💾 حفظ</button>
      <button onclick="cancelEditResource()" class="submit-btn" style="margin: 0; padding: 0.5rem; background: var(--bg-primary); border: 1px solid var(--border); color: var(--text-secondary);">إلغاء</button>
    </div>
  </div>`;
}

function startEditResource(id) { editingResourceId = id; renderResources(); }
window.startEditResource = startEditResource;

function cancelEditResource() { editingResourceId = null; renderResources(); }
window.cancelEditResource = cancelEditResource;

async function saveEditResource(id) {
  const title = document.getElementById(`edit_title_${id}`).value.trim();
  const description = document.getElementById(`edit_desc_${id}`).value.trim();
  const link = document.getElementById(`edit_link_${id}`).value.trim() || '#';
  const cloudLink = document.getElementById(`edit_cloud_${id}`).value.trim();

  if (!title) { showToast('عنوان المورد لا يمكن أن يكون فارغاً.', true); return; }

  try {
    await db.collection('resources').doc(id).update({
      title, description, link, cloudLink,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    editingResourceId = null;
    showToast('✏️ تم تحديث المورد بنجاح');
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || err.message, true);
  }
}
window.saveEditResource = saveEditResource;

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(f) || (f === 'الكل' && b.textContent === 'الكل')));
  renderResources();
}
window.setFilter = setFilter;

async function handleAddResource(e) {
  e.preventDefault();
  const title = document.getElementById('newTitle').value.trim();
  if (!title) { showToast('يرجى كتابة عنوان للمادة أو الكود أولاً.', true); return; }

  try {
    await db.collection('resources').add({
      title,
      description: document.getElementById('newDescription').value.trim(),
      type: document.getElementById('newType').value,
      duration: Math.max(1, parseInt(document.getElementById('newDuration').value) || 20),
      difficulty: parseInt(document.getElementById('newDifficulty').value),
      link: document.getElementById('newLink').value.trim() || '#',
      cloudLink: document.getElementById('newCloudLink').value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('🚀 تم نشر واعتماد المصدر التعليمي بنجاح في السحابة لجميع الأعضاء!');
    e.target.reset();
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || ('خطأ أثناء النشر السحابي: ' + err.message), true);
  }
}
window.handleAddResource = handleAddResource;

function confirmDeleteResource(id) {
  showConfirmModal({
    title: 'تأكيد الحذف',
    message: 'هل أنت متأكد من حذف هذا المستند نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmText: 'حذف نهائي',
    danger: true,
    onConfirm: async () => {
      try {
        await db.collection('resources').doc(id).delete();
        showToast('🗑️ تم حذف وإلغاء المادة التعليمية بنجاح من الخادم');
      } catch (err) {
        showToast(getFirebaseErrorMessage(err.code) || err.message, true);
      }
    }
  });
}
window.confirmDeleteResource = confirmDeleteResource;

/* ============================================================
   اقتراحات الطلاب (Student Suggestions)
   ============================================================ */
async function handleStudentSuggestion(e) {
  e.preventDefault();
  const title = document.getElementById('suggestTitle').value.trim();
  if (!title) { showToast('يرجى كتابة عنوان الاقتراح.', true); return; }

  const type = document.getElementById('suggestType').value;
  const link = document.getElementById('suggestLink').value.trim() || '#';

  try {
    await db.collection('suggestions').add({
      title, type, link,
      studentName: currentUserData.name,
      studentUid: currentUserData.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('💡 تم إرسال اقتراحك المبتكر بنجاح، سيقوم الأستاذ بمراجعته واعتماده قريباً!');
    e.target.reset();
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || ('حدث خطأ أثناء رفع الاقتراح: ' + err.message), true);
  }
}
window.handleStudentSuggestion = handleStudentSuggestion;

function listenToSuggestions() {
  if (unsubSuggestions) unsubSuggestions();
  unsubSuggestions = db.collection('suggestions').onSnapshot(snap => {
    const tbody = document.getElementById('pendingSuggestionsBody');
    if (!tbody) return;
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-weight: 500;">لا توجد مساهمات أو اقتراحات معلقة من الأعضاء حالياً.</td></tr>`;
      return;
    }

    let docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    tbody.innerHTML = docs.map(sug => {
      const icon = typeIcons[sug.type] || '💡';
      const safeLink = sanitizeURL(sug.link);
      return `
        <tr>
          <td style="font-weight: 700; font-size: 12px;">${escapeHTML(sug.studentName || 'عضو في النادي')}</td>
          <td>
            <span style="font-weight: 700; display: block;">${escapeHTML(sug.title)}</span>
            ${sug.link && sug.link !== '#' ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 700; text-decoration: underline; font-size: 10px; margin-top: 0.25rem; display: inline-block;"><i class="fa-solid fa-link"></i> معاينة الرابط أو الملف المقترح</a>` : ''}
          </td>
          <td><span class="resource-type-tag" style="font-size: 11px;">${icon} ${escapeHTML(sug.type)}</span></td>
          <td>
            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button onclick="approveSuggestion('${sug.id}')" class="table-btn">✔️ اعتماد ونشر</button>
              <button onclick="confirmRejectSuggestion('${sug.id}')" class="table-btn table-btn-secondary">رفض وإلغاء</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }, err => console.error(err));
}

async function approveSuggestion(id) {
  try {
    const doc = await db.collection('suggestions').doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      await db.collection('resources').add({
        title: data.title,
        description: '',
        type: data.type,
        duration: 20,
        difficulty: 1,
        link: data.link || '#',
        cloudLink: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('suggestions').doc(id).delete();
      showToast('🚀 تم اعتماد مادة ومساهمة الطالب ونشرها بنجاح لجميع أعضاء النادي!');
    }
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || err.message, true);
  }
}
window.approveSuggestion = approveSuggestion;

function confirmRejectSuggestion(id) {
  showConfirmModal({
    title: 'رفض الاقتراح',
    message: 'هل أنت متأكد من رفض وحذف المقترح المقدم من العضو بشكل نهائي؟',
    confirmText: 'حذف الاقتراح',
    danger: true,
    onConfirm: async () => {
      try {
        await db.collection('suggestions').doc(id).delete();
        showToast('🗑️ تم رفض وإزالة المقترح المعلق بنجاح');
      } catch (err) {
        showToast(getFirebaseErrorMessage(err.code) || err.message, true);
      }
    }
  });
}
window.confirmRejectSuggestion = confirmRejectSuggestion;

/* ============================================================
   الطلاب، سجل العلامات، لوحة الأستاذ (Students & Gradebook)
   ============================================================ */
function listenToStudents() {
  if (unsubStudents) unsubStudents();
  renderGradebook();
  unsubStudents = db.collection('users').where('approved', '==', true).onSnapshot(snap => {
    allStudents = []; snap.forEach(d => allStudents.push(d.data()));
    studentsFirstLoad = false;
    renderGradebook();
    updateKPIs();
    if (currentUserData && currentUserData.role === 'teacher') renderAnalyticsCharts();
  }, err => {
    console.error(err);
    studentsFirstLoad = false;
  });
}

function listenToTeacherData() {
  if (unsubPendingUsers) unsubPendingUsers();
  unsubPendingUsers = db.collection('users').where('approved', '==', false).onSnapshot(snap => {
    const tbody = document.getElementById('pendingUsersBody');
    if (snap.empty) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-weight: 500;">لا توجد طلبات انضمام معلقة حالياً.</td></tr>`; return; }
    let html = '';
    snap.forEach(d => {
      const u = d.data();
      html += `
        <tr>
          <td style="font-weight: 700;">${escapeHTML(u.name)}</td>
          <td style="text-align: left;" dir="ltr">${escapeHTML(u.email)}</td>
          <td style="font-weight: 700;">${escapeHTML(u.cohort)} <span style="font-size: 10px; color: var(--primary); display: block; font-weight: 500;">${escapeHTML(u.team)}</span></td>
          <td>
            <div style="display: flex; gap: 0.5rem; justify-content: center;">
              <button onclick="approveUser('${u.uid}')" class="table-btn">✔️ قبول وتفعيل</button>
              <button onclick="confirmRejectUser('${u.uid}')" class="table-btn table-btn-danger">رفض وحذف</button>
            </div>
          </td>
        </tr>`;
    });
    tbody.innerHTML = html;
  }, err => console.error(err));
}

async function approveUser(uid) {
  try {
    await db.collection('users').doc(uid).update({ approved: true });
    showToast('✔️ تم قبول وتنشيط ملف حساب الطالب بنجاح وإدراجه بالسحابة');
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || ('خطأ تفعيل المستخدم: ' + err.message), true);
  }
}
window.approveUser = approveUser;

function confirmRejectUser(uid) {
  showConfirmModal({
    title: 'حذف العضو',
    message: 'أمن البيانات: هل أنت متأكد من الحذف والرفض التام لملف هذا العضو من السجلات؟ لا يمكن التراجع عن هذا الإجراء.',
    confirmText: 'حذف نهائي',
    danger: true,
    onConfirm: async () => {
      try {
        await db.collection('users').doc(uid).delete();
        showToast('❌ تم تصفية وحذف العضو بنجاح من الخادم');
      } catch (err) {
        showToast(getFirebaseErrorMessage(err.code) || ('فشل عملية التصفية: ' + err.message), true);
      }
    }
  });
}
window.confirmRejectUser = confirmRejectUser;

function renderGradebook() {
  const tbody = document.getElementById('gradebookBody');

  if (studentsFirstLoad) {
    tbody.innerHTML = Array(4).fill(`<tr><td colspan="6" class="p-4"><div class="skeleton" style="height: 1.5rem; width: 100%;"></div></td></tr>`).join('');
    return;
  }

  const selectedCohort = document.getElementById('gradebookCohortFilter').value;
  let studentsOnly = allStudents.filter(s => s.role !== 'teacher');
  if (selectedCohort !== 'الكل') studentsOnly = studentsOnly.filter(s => s.cohort === selectedCohort);

  if (studentsOnly.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-weight: 500;">لا يوجد طلاب مسجلون أو مفعلون في هذا الفوج حتى الآن.</td></tr>`;
    return;
  }

  tbody.innerHTML = studentsOnly.map(s => {
    const avg = ((s.python || 0) + (s.hackathon || 0)) / 2;

    let badgeClass = "badge-grade fail";
    if (avg >= 15.0) {
      badgeClass = "badge-grade excellent";
    } else if (avg >= 10.0 && avg < 15.0) {
      badgeClass = "badge-grade good";
    }

    return `
      <tr>
        <td style="font-weight: 700;">${escapeHTML(s.name)}</td>
        <td style="font-weight: 700;">${escapeHTML(s.cohort)}<br><span style="font-size: 10px; color: var(--primary); font-weight: 700;">${escapeHTML(s.team)}</span></td>
        <td><input type="number" step="0.5" min="0" max="20" value="${s.python}" onchange="updateGrade('${s.uid}', 'python', this.value)" class="grade-input"></td>
        <td><input type="number" step="0.5" min="0" max="20" value="${s.hackathon}" onchange="updateGrade('${s.uid}', 'hackathon', this.value)" class="grade-input"></td>
        <td><span class="${badgeClass}">${avg.toFixed(1)}</span></td>
        <td>
          <div style="display: flex; gap: 0.25rem; justify-content: center;">
            <button onclick="openCertificate('${s.uid}')" aria-label="طباعة شهادة تقدير" title="طباعة شهادة تقدير" class="icon-action-btn award-icon"><i class="fa-solid fa-award"></i></button>
            <button onclick="confirmRejectUser('${s.uid}')" aria-label="حذف الطالب" title="حذف الطالب" class="icon-action-btn delete-icon"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}
window.renderGradebook = renderGradebook;

async function updateGrade(uid, field, value) {
  const val = Math.max(0, Math.min(20, parseFloat(value) || 0));
  try {
    await db.collection('users').doc(uid).update({ [field]: val });
    showToast('💾 تم حفظ ورصد العلامة وتحديث المعدل الحسابي فورياً بسجل الخادم');
  } catch (err) {
    showToast(getFirebaseErrorMessage(err.code) || ('فشل رصد العلامة: ' + err.message), true);
  }
}
window.updateGrade = updateGrade;

function updateKPIs() {
  const studentsOnly = allStudents.filter(s => s.role !== 'teacher');
  document.getElementById('kpiStudents').textContent = studentsOnly.length;
  document.getElementById('kpiMale').textContent = studentsOnly.filter(s => s.cohort === 'فوج الذكور').length;
  document.getElementById('kpiFemale').textContent = studentsOnly.filter(s => s.cohort === 'فوج الإناث').length;
  const avgs = studentsOnly.map(s => ((s.python || 0) + (s.hackathon || 0)) / 2);
  document.getElementById('kpiAverage').textContent = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '0.0';
}

/* ============================================================
   التحليلات البيانية (Analytics Charts) — عبر Chart.js
   ============================================================ */
function renderAnalyticsCharts() {
  const barCtx = document.getElementById('cohortChart');
  const gradeCtx = document.getElementById('gradeChart');
  if (!barCtx || !gradeCtx) return;

  const studentsOnly = allStudents.filter(s => s.role !== 'teacher');
  if (studentsOnly.length === 0) {
    if (cohortChart) { cohortChart.destroy(); cohortChart = null; }
    if (gradeChart) { gradeChart.destroy(); gradeChart = null; }
    return;
  }

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(226, 232, 240, 0.05)' : 'rgba(71, 85, 105, 0.05)';

  const cohorts = ['فوج الذكور', 'فوج الإناث'];
  const pythonAvgs = cohorts.map(c => {
    const arr = studentsOnly.filter(s => s.cohort === c).map(s => s.python || 0);
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });
  const hackathonAvgs = cohorts.map(c => {
    const arr = studentsOnly.filter(s => s.cohort === c).map(s => s.hackathon || 0);
    return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });

  if (cohortChart) cohortChart.destroy();
  cohortChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: cohorts,
      datasets: [
        { label: 'بايثون', data: pythonAvgs, backgroundColor: '#0f766e', borderRadius: 6 },
        { label: 'هاكاثون', data: hackathonAvgs, backgroundColor: '#d97706', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' }, color: textColor } } },
      scales: {
        y: { beginAtZero: true, max: 20, ticks: { color: textColor }, grid: { color: gridColor } },
        x: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  const excellent = studentsOnly.filter(s => ((s.python || 0) + (s.hackathon || 0)) / 2 >= 15).length;
  const good = studentsOnly.filter(s => { const a = ((s.python || 0) + (s.hackathon || 0)) / 2; return a >= 10 && a < 15; }).length;
  const needsWork = studentsOnly.filter(s => ((s.python || 0) + (s.hackathon || 0)) / 2 < 10).length;

  if (gradeChart) gradeChart.destroy();
  gradeChart = new Chart(gradeCtx, {
    type: 'doughnut',
    data: {
      labels: ['ممتاز (15+)', 'جيد (10-15)', 'يحتاج دعم (أقل من 10)'],
      datasets: [{ data: [excellent, good, needsWork], backgroundColor: ['#0f766e', '#d97706', '#e11d48'] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' }, color: textColor, boxWidth: 12 } } }
    }
  });
}

/* ============================================================
   تصدير سجل العلامات إلى ملف CSV
   ============================================================ */
function exportGradebookCSV() {
  const selectedCohort = document.getElementById('gradebookCohortFilter').value;
  let studentsOnly = allStudents.filter(s => s.role !== 'teacher');
  if (selectedCohort !== 'الكل') studentsOnly = studentsOnly.filter(s => s.cohort === selectedCohort);

  if (studentsOnly.length === 0) { showToast('لا توجد بيانات لتصديرها حالياً.', true); return; }

  const headers = ['الاسم', 'الفوج', 'الفريق', 'بايثون', 'هاكاثون', 'المعدل'];
  const rows = studentsOnly.map(s => [
    s.name, s.cohort, s.team, s.python, s.hackathon, (((s.python || 0) + (s.hackathon || 0)) / 2).toFixed(1)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `سجل_العلامات_${selectedCohort === 'الكل' ? 'جميع_الأفواج' : selectedCohort}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📊 تم تصدير سجل العلامات بنجاح');
}
window.exportGradebookCSV = exportGradebookCSV;

/* ============================================================
   شهادات التقدير القابلة للطباعة (Printable Certificates)
   ============================================================ */
function openCertificate(uid) {
  const s = allStudents.find(st => st.uid === uid);
  if (!s) return;
  const avg = (((s.python || 0) + (s.hackathon || 0)) / 2).toFixed(1);
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('certificateSection').innerHTML = `
    <div style="width: 100%; height: 100%; border: 8px double #0f766e; color: #1c1917; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1rem;">
      <div style="font-size: 3rem;">🏆</div>
      <div style="font-size: 12px; letter-spacing: 0.1em; color: #6b7280; font-weight: 700;">جمعية شباب الغد المتميز — نادي الخوارزمي العلمي</div>
      <h1 class="font-display" style="font-size: 2.5rem; font-weight: 900; color: #134e4a; margin: 0.5rem 0;">شهادة تقدير</h1>
      <p style="color: #4b5563;">تشهد إدارة النادي العلمي بأن الطالب(ة)</p>
      <h2 class="font-display" style="font-size: 2rem; font-weight: 900; color: #1f2937; margin: 0.5rem 0;">${escapeHTML(s.name)}</h2>
      <p style="color: #4b5563; max-width: 400px; margin: 0 auto;">من ${escapeHTML(s.cohort)} قد أظهر(ت) التزاماً وتفوقاً بمعدل عام قدره</p>
      <div style="font-size: 3.5rem; font-weight: 900; color: #d97706; margin: 0.5rem 0;">${avg} / 20</div>
      <p style="color: #9ca3af; font-size: 14px; margin-top: 1.5rem;">حُررت بتاريخ: ${escapeHTML(today)}</p>
    </div>
  `;
  window.print();
}
window.openCertificate = openCertificate;

window.addEventListener('afterprint', () => {
  document.getElementById('certificateSection').innerHTML = '';
});

/* ============================================================
   نسخ البرومبتات الجاهزة للتفاعل مع Claude
   ============================================================ */
function copyPrompt(btnElement) {
  const card = btnElement.closest('.prompt-card');
  const promptText = card.querySelector('.prompt-text').textContent.trim();

  navigator.clipboard.writeText(promptText).then(() => {
    showToast('📋 تم نسخ البرومبت الهندسي بنجاح! الصقه الآن في محادثتك مع Claude.');

    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-check-double" style="color: #a7f3d0;"></i> <span>تم النسخ!</span>';
    btnElement.style.background = 'var(--primary)';
    btnElement.style.color = '#fff';

    setTimeout(() => {
      btnElement.innerHTML = originalHTML;
      btnElement.style.background = '';
      btnElement.style.color = '';
    }, 2500);
  }).catch(err => {
    showToast('❌ عذراً، تعذر الوصول لـ Clipboard. يرجى التحديد والنسخ يدوياً.', true);
  });
}
window.copyPrompt = copyPrompt;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
