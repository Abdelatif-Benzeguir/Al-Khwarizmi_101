export function sanitizeURL(url?: string): string {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (trimmed === '' || trimmed === '#') return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '#';
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getRelativeTime(timestamp?: any): string {
  if (!timestamp?.toMillis) return '';
  const diff = Date.now() - timestamp.toMillis();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${months} شهر`;
}

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const m = Math.floor(Number(minutes));
  if (isNaN(m)) return '';
  if (m < 60) return `${m}:00`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}:${String(rem).padStart(2, '0')}:00`;
}

export function getFirebaseErrorMessage(code?: string): string | null {
  const map: Record<string, string> = {
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

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatQuizText(text: string): string {
  return text.replace(/`([^`]+)`/g, '<span class="ltr-code-inline" dir="ltr">$1</span>');
}

export const typeIcons: Record<string, string> = {
  'محاضرة': '📚',
  'فيديو': '🎥',
  'كود بايثون': '🐍',
  'برومبت': '💬',
  'مصطلح': '📖'
};
