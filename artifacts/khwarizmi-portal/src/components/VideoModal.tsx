import { useEffect } from 'react';

interface VideoModalProps {
  videoId: string | null;
  title: string;
  onClose: () => void;
}

export function VideoModal({ videoId, title, onClose }: VideoModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (videoId) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [videoId, onClose]);

  if (!videoId) return null;

  return (
    <div className="video-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="video-modal-close" onClick={onClose} aria-label="إغلاق مشغل الفيديو">
        <i className="fa-solid fa-xmark"></i>
      </button>
      <div className="video-modal-content">
        <div className="video-modal-player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={title}
          />
        </div>
        <div className="video-modal-info">
          <h3 className="video-modal-title">{title}</h3>
          <div className="video-modal-meta">
            <img src="https://i.ibb.co/wZ5MX8R4/4897896.jpg" alt="" className="video-channel-avatar" />
            <div>
              <span className="video-channel-name">نادي الخوارزمي العلمي</span>
              <span className="video-channel-sub">Al-Khwarizmi 101</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
