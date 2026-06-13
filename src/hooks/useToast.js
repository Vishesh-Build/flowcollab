import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const addToast = useCallback((type, message, duration = 3500) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, type, message, leaving: false }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, duration)  => addToast("success", msg, duration),
    error:   (msg, duration)  => addToast("error",   msg, duration ?? 5000),
    info:    (msg, duration)  => addToast("info",    msg, duration),
    warning: (msg, duration)  => addToast("warning", msg, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Visual stack ────────────────────────────────────────────────────────────

const ICONS = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const STYLES = {
  success: { bg: "rgba(16,16,16,0.97)", border: "rgba(40,200,64,0.35)",  icon: "#28c840", bar: "#28c840" },
  error:   { bg: "rgba(16,16,16,0.97)", border: "rgba(255,95,87,0.35)",  icon: "#ff5f57", bar: "#ff5f57" },
  info:    { bg: "rgba(16,16,16,0.97)", border: "rgba(99,102,241,0.35)", icon: "#818cf8", bar: "#818cf8" },
  warning: { bg: "rgba(16,16,16,0.97)", border: "rgba(245,158,11,0.35)", icon: "#f59e0b", bar: "#f59e0b" },
};

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes fc-toast-in {
          from { opacity: 0; transform: translateX(16px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes fc-toast-out {
          from { opacity: 1; transform: translateX(0)    scale(1); }
          to   { opacity: 0; transform: translateX(16px) scale(0.97); }
        }
        @keyframes fc-bar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        .fc-toast {
          animation: fc-toast-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .fc-toast.leaving {
          animation: fc-toast-out 0.25s ease forwards;
        }
        .fc-toast-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .fc-toast-close:hover { color: rgba(255,255,255,0.8); }
      `}</style>

      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        maxWidth: 340,
        width: "calc(100vw - 48px)",
      }}>
        {toasts.map(t => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`fc-toast${t.leaving ? " leaving" : ""}`}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                pointerEvents: "all",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {/* Left color accent */}
              <div style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: 3,
                background: s.bar,
                borderRadius: "8px 0 0 8px",
              }} />

              {/* Icon */}
              <div style={{
                color: s.icon,
                flexShrink: 0,
                marginTop: 1,
                marginLeft: 4,
              }}>
                {ICONS[t.type]}
              </div>

              {/* Message */}
              <span style={{
                flex: 1,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.55,
                fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",
                wordBreak: "break-word",
              }}>
                {t.message}
              </span>

              {/* Dismiss */}
              <button
                className="fc-toast-close"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}