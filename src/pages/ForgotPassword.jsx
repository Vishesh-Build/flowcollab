
import { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Reset email sent! Check your inbox.");
    } catch (err) {
      setMessage("❌ No account found with this email.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "white", display: "flex", flexDirection: "column" }}>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orb1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
        @keyframes orb2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,40px); } }
        .fc-input { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 6px !important; padding: 11px 14px !important; font-size: 13px !important; color: white !important; width: 100% !important; outline: none !important; transition: border-color .2s !important; box-sizing: border-box !important; }
        .fc-input:focus { border-color: rgba(255,255,255,0.25) !important; }
        .fc-input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .fc-btn-white { background: white; color: black; border: none; border-radius: 6px; padding: 11px 0; font-size: 13px; font-weight: 500; cursor: pointer; width: 100%; transition: opacity .2s; }
        .fc-btn-white:hover { opacity: 0.9; }
        .a1 { animation: fadeUp 0.4s ease 0.1s both; }
        .a2 { animation: fadeUp 0.4s ease 0.2s both; }
        .a3 { animation: fadeUp 0.4s ease 0.3s both; }
        .a4 { animation: fadeUp 0.4s ease 0.4s both; }
      `}</style>

      {/* BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 500, height: 500, background: "radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 65%)", animation: "orb1 14s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 600, height: 600, background: "radial-gradient(circle,rgba(120,80,255,0.04) 0%,transparent 65%)", animation: "orb2 18s ease-in-out infinite" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sg3" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.3" opacity="0.04" /></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sg3)" />
        </svg>
      </div>

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.7)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.2" fill="none" />
            <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.15" />
            <circle cx="11" cy="11" r="2" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.2px" }}>FlowCollab</span>
        </div>
        <span onClick={() => navigate("/login")} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
          ← Back to login
        </span>
      </nav>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", zIndex: 5 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          <div className="a1" style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-1px", marginBottom: 6 }}>Reset your password</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>Enter your email and we'll send you a reset link.</p>
          </div>

          {message && (
            <div style={{ background: message.startsWith("✅") ? "rgba(40,200,64,0.08)" : "rgba(255,95,87,0.08)", border: `1px solid ${message.startsWith("✅") ? "rgba(40,200,64,0.2)" : "rgba(255,95,87,0.2)"}`, borderRadius: 6, padding: "10px 14px", fontSize: 12.5, color: message.startsWith("✅") ? "rgba(150,255,160,0.9)" : "rgba(255,180,175,0.9)", marginBottom: 20 }}>
              {message}
            </div>
          )}

          <form onSubmit={handleReset}>
            <div className="a2" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
              <input className="fc-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="a3">
              <button type="submit" className="fc-btn-white" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>

          <p className="a4" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 24 }}>
            Remembered it?{" "}
            <span onClick={() => navigate("/login")} style={{ color: "rgba(255,255,255,0.6)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</span>
          </p>

        </div>
      </div>
    </div>
  );
}