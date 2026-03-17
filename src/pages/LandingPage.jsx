
import { useNavigate } from "react-router-dom";

const scrollToHowItWorks = () => {
  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "white", overflowX: "hidden", position: "relative" }}>

      {/* BG Grid + Orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 600, height: 600, background: "radial-gradient(circle,rgba(255,255,255,0.025) 0%,transparent 65%)", animation: "orb1 14s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 700, height: 700, background: "radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 65%)", animation: "orb2 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "40%", left: "35%", width: 500, height: 500, background: "radial-gradient(circle,rgba(120,80,255,0.04) 0%,transparent 65%)", animation: "orb3 22s ease-in-out infinite", transform: "translate(-50%,-50%)" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.3" opacity="0.04" /></pattern>
            <pattern id="bg2" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="url(#sg)" /><path d="M 200 0 L 0 0 0 200" fill="none" stroke="white" strokeWidth="0.6" opacity="0.06" /></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg2)" />
        </svg>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)", animation: "scanline 8s linear infinite" }} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes floatY { 0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); } 33% { transform: translateY(-10px) rotateX(2deg) rotateY(1deg); } 66% { transform: translateY(-5px) rotateX(-1deg) rotateY(-2deg); } }
        @keyframes orb1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-40px) scale(1.1); } }
        @keyframes orb2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,50px) scale(0.9); } }
        @keyframes orb3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,30px); } }
        @keyframes lineGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes msgIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes numberUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .fc-hover-card { transition: border-color .25s, transform .3s, box-shadow .3s; }
        .fc-hover-card:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateY(-4px); box-shadow: 0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) !important; }
        .fc-btn { transition: all .2s; }
        .fc-btn:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.4) !important; }
        .fc-nav-item { transition: color .15s; cursor: pointer; }
        .fc-nav-item:hover { color: rgba(255,255,255,0.9) !important; }
        .a1 { animation: fadeUp 0.5s ease 0.1s both; }
        .a2 { animation: fadeUp 0.5s ease 0.2s both; }
        .a3 { animation: fadeUp 0.5s ease 0.3s both; }
        .a4 { animation: fadeUp 0.5s ease 0.4s both; }
        .a5 { animation: fadeUp 0.5s ease 0.5s both; }
        .n1 { animation: numberUp 0.5s ease 1s both; }
        .n2 { animation: numberUp 0.5s ease 1.1s both; }
        .n3 { animation: numberUp 0.5s ease 1.2s both; }
        .m1 { animation: msgIn 0.3s ease 1.2s both; opacity: 0; }
        .m2 { animation: msgIn 0.3s ease 1.5s both; opacity: 0; }
        .m3 { animation: msgIn 0.3s ease 1.8s both; opacity: 0; }
        .s1 { animation: fadeUp 0.5s ease 0.1s both; opacity: 0; }
        .s2 { animation: fadeUp 0.5s ease 0.2s both; opacity: 0; }
        .s3 { animation: fadeUp 0.5s ease 0.3s both; opacity: 0; }
        .s4 { animation: fadeUp 0.5s ease 0.4s both; opacity: 0; }
        .s5 { animation: fadeUp 0.5s ease 0.5s both; opacity: 0; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.7)", animation: "fadeIn 0.4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.2" fill="none" />
            <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.15" />
            <circle cx="11" cy="11" r="2" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.2px" }}>FlowCollab</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          
          <span className="fc-nav-item" onClick={scrollToHowItWorks} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Features</span>
          <span className="fc-nav-item" onClick={scrollToHowItWorks} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>How it works</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer", padding: "6px 14px" }}>Login</button>
          <button className="fc-btn" onClick={() => navigate("/signup")} style={{ background: "white", color: "black", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "52px 40px 40px" }}>
        <div className="a1" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "4px 12px", marginBottom: 24 }}>
          <div style={{ width: 5, height: 5, background: "#fff", borderRadius: "50%", opacity: 0.6, animation: "pulseGlow 2s infinite" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase" }}>v1.0 — Now open</span>
        </div>
        <h1 className="a2" style={{ fontSize: "clamp(38px,6.5vw,72px)", fontWeight: 600, lineHeight: 1.0, letterSpacing: "-3px", marginBottom: 18, maxWidth: 760 }}>
          Your team. One codebase.<br />
          <span style={{ color: "rgba(255,255,255,0.22)" }}>Zero conflicts.</span>
        </h1>
        <p className="a3" style={{ fontSize: 15, color: "rgba(255,255,255,0.38)", maxWidth: 460, lineHeight: 1.8, marginBottom: 32, fontWeight: 300 }}>
          What if your whole team shared one AI brain? That's FlowCollab it's free, private, instant.
        </p>
        <div className="a4" style={{ display: "flex", gap: 10 }}>
          <button className="fc-btn" onClick={() => navigate("/signup")} style={{ background: "white", color: "black", border: "none", borderRadius: 6, padding: "11px 26px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            Start for free
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          {/* ✅ FIX: See how it works — scroll to section */}
          <button onClick={scrollToHowItWorks} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "11px 22px", fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            See how it works →
          </button>
        </div>
        {/* Stats */}
        <div className="a5" style={{ display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, overflow: "hidden", marginTop: 36 }}>
          <div style={{ padding: "12px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
            <div className="n1" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-1px" }}>100%</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" }}>Free forever</div>
          </div>
          <div style={{ padding: "12px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
            <div className="n2" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-1px" }}>3</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" }}>AI providers</div>
          </div>
          <div style={{ padding: "12px 28px", textAlign: "center" }}>
            <div className="n3" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-1px" }}>0</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 2, letterSpacing: "0.5px", textTransform: "uppercase" }}>Merge conflicts</div>
          </div>
        </div>
      </section>

      {/* 3D MOCKUP */}
      <section style={{ position: "relative", zIndex: 5, padding: "8px 40px 48px", display: "flex", justifyContent: "center" }}>
        <div style={{ animation: "floatY 6s ease-in-out infinite", width: "100%", maxWidth: 800, perspective: 1000 }}>
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.03),inset 0 1px 0 rgba(255,255,255,0.06)", transform: "rotateX(4deg) rotateY(-1deg)" }}>
            <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              </div>
              <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 4, padding: "4px 12px", textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>flowcollab.app/room/xk92</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 250px", height: 300 }}>
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: "10px 0", background: "#0a0a0a" }}>
                <div style={{ padding: "3px 14px", fontSize: 9.5, color: "rgba(255,255,255,0.18)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>Explorer</div>
                <div style={{ padding: "4px 14px", fontSize: 11.5, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 3l3 3 3-3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" fill="none" /></svg> src
                </div>
                <div style={{ padding: "4px 14px 4px 24px", fontSize: 11.5, background: "rgba(255,255,255,0.05)", color: "white", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, background: "#ff5f57", borderRadius: "50%", flexShrink: 0 }} /> auth.js
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "#ff5f57", background: "rgba(255,95,87,0.12)", padding: "1px 5px", borderRadius: 3 }}>A+B</span>
                </div>
                <div style={{ padding: "4px 14px 4px 24px", fontSize: 11.5, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, background: "#28c840", borderRadius: "50%", flexShrink: 0 }} /> db.js
                </div>
                <div style={{ padding: "4px 14px 4px 24px", fontSize: 11.5, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", flexShrink: 0 }} /> routes.js
                </div>
                <div style={{ margin: "10px 0 0", padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.18)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 7 }}>Team</div>
                  {[{ l: "A", c: "#6366f1", n: "Alex", on: true }, { l: "B", c: "#3b82f6", n: "Ben", on: true }, { l: "C", c: "#8b5cf6", n: "Cara", on: false }].map((m) => (
                    <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      <div style={{ width: 17, height: 17, background: m.c, borderRadius: "50%", fontSize: 8.5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{m.l}</div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{m.n}</span>
                      <div style={{ marginLeft: "auto", width: 5, height: 5, background: m.on ? "#28c840" : "#febc2e", borderRadius: "50%" }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#0d0d0d", padding: 14, fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, lineHeight: 1.85, overflow: "hidden" }}>
                <div style={{ color: "rgba(255,255,255,0.18)" }}>1 &nbsp;<span style={{ color: "#5a5a5a" }}>// auth.js — JWT implementation</span></div>
                <div>2 &nbsp;<span style={{ color: "#569cd6" }}>const</span> <span style={{ color: "#9cdcfe" }}>jwt</span> <span style={{ color: "rgba(255,255,255,0.4)" }}>=</span> <span style={{ color: "#ce9178" }}>require</span><span style={{ color: "rgba(255,255,255,0.35)" }}>('jsonwebtoken')</span></div>
                <div style={{ color: "rgba(255,255,255,0.18)" }}>3</div>
                {[4, 5, 6, 7].map(n => (
                  <div key={n} style={{ background: "rgba(99,102,241,0.08)", borderLeft: "2px solid #6366f1", paddingLeft: 6 }}>
                    {n === 4 && <>{n} &nbsp;<span style={{ color: "#569cd6" }}>const</span> <span style={{ color: "#dcdcaa" }}>login</span> <span style={{ color: "rgba(255,255,255,0.35)" }}>=</span> <span style={{ color: "#569cd6" }}>async</span> <span style={{ color: "rgba(255,255,255,0.35)" }}>(req, res) =&gt; {"{"}</span></>}
                    {n === 5 && <>{n} &nbsp;&nbsp;&nbsp;<span style={{ color: "#569cd6" }}>const</span> <span style={{ color: "#9cdcfe" }}>token</span> <span style={{ color: "rgba(255,255,255,0.4)" }}>=</span> jwt.<span style={{ color: "#dcdcaa" }}>sign</span>{"("}{"{"}  </>}
                    {n === 6 && <>{n} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#9cdcfe" }}>id</span>: user._id, <span style={{ color: "#9cdcfe" }}>role</span>: user.role</>}
                    {n === 7 && <>{n} &nbsp;&nbsp;&nbsp;{"}"}, process.env.<span style={{ color: "#9cdcfe" }}>JWT_SECRET</span>)</>}
                  </div>
                ))}
                <div>8 &nbsp;&nbsp;&nbsp;<span style={{ color: "#c586c0" }}>return</span> res.<span style={{ color: "#dcdcaa" }}>json</span>{"({ token })"}</div>
                <div>9 &nbsp;<span style={{ color: "rgba(255,255,255,0.35)" }}>{"}"}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 8px", background: "rgba(255,95,87,0.08)", border: "1px solid rgba(255,95,87,0.18)", borderRadius: 4, width: "fit-content" }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ff5f57" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                  <span style={{ fontSize: 10, color: "#ff5f57" }}>Conflict — Alex & Ben both on auth.js</span>
                </div>
              </div>
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "#080808", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="10" height="10" viewBox="0 0 22 22" fill="none"><polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" /><circle cx="11" cy="11" r="2" fill="rgba(255,255,255,0.45)" /></svg>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>AI Assistant</span>
                </div>
                <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
                  {[
                    { cls: "m1", who: "Alex", msg: '"Add JWT to login function"', warn: false },
                    { cls: "m2", who: "Ben", msg: '"Optimize DB connection"', warn: false },
                    { cls: "m3", who: "AI", msg: null, warn: true }
                  ].map((m) => (
                    <div key={m.who} className={m.cls}>
                      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", marginBottom: 3 }}>{m.who}</div>
                      {m.warn
                        ? <div style={{ background: "rgba(255,95,87,0.07)", border: "1px solid rgba(255,95,87,0.16)", borderRadius: 5, padding: "7px 9px", fontSize: 10.5, color: "rgba(255,190,185,0.8)", lineHeight: 1.5 }}>
                            Hold on — Alex & Ben both on <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 4px", borderRadius: 2, fontSize: 9.5 }}>auth.js</code>. Finish Alex's task first.
                          </div>
                        : <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "7px 9px", fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{m.msg}</div>
                      }
                    </div>
                  ))}
                </div>
                <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "6px 10px", fontSize: 10.5, color: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    Ask the team AI...
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — ✅ id add kiya scroll ke liye */}
      <section id="how-it-works" style={{ position: "relative", zIndex: 5, padding: "40px 48px 48px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap" }}>How it works</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)", transformOrigin: "left", animation: "lineGrow 0.8s ease both" }} />
        </div>
        {[
          { n: "01", t: "Create a room. Invite your team.", d: "Sign up free. One click creates a room with a unique invite link. Dev B and C join instantly — all on the same codebase.", tags: null },
          { n: "02", t: "Load your codebase.", d: "Upload files or paste code. Every teammate sees the same codebase in real-time inside a Monaco editor. One edits — all see it instantly.", tags: null },
          { n: "03", t: "Plug in your own API key.", d: "Each dev adds their own key — Claude, GPT-4, or Gemini. AES-encrypted, isolated per user. No one else sees it. Not even us.", tags: ["Claude", "GPT-4", "Gemini"] },
          { n: "04", t: "Ask the AI. As a team.", d: "AI knows your full codebase, who is editing what, and which files are hot. It catches conflicts before they happen and tells the team exactly why.", tags: null },
          { n: "05", t: "Review, approve, merge.", d: "AI-generated code is visible to the whole team. Anyone approves or rejects. Once approved — syncs to everyone instantly.", tags: null },
        ].map((s, i) => (
          <div key={s.n} className={`s${i + 1}`} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 20, padding: "20px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.14)", fontWeight: 500, paddingTop: 3, letterSpacing: "1px" }}>{s.n}</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.4px", marginBottom: 6 }}>{s.t}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", lineHeight: 1.75, maxWidth: 520 }}>{s.d}</p>
              {s.tags && (
                <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                  {s.tags.map(tag => <span key={tag} style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 4, padding: "2px 9px" }}>{tag}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 5, padding: "40px 48px 56px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 500 }}>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-1.2px", marginBottom: 12, lineHeight: 1.1 }}>Ready to build with your team?</h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.32)", lineHeight: 1.8, marginBottom: 26 }}>FlowCollab is free. Bring your team, bring your API key. No setup fees — just ship faster.</p>
          <button className="fc-btn" onClick={() => navigate("/signup")} style={{ background: "white", color: "black", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
            Start for free
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", zIndex: 5, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.2" fill="none" />
            <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.15" />
            <circle cx="11" cy="11" r="2" fill="white" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>FlowCollab</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Made with</span>
          <span style={{ fontSize: 14 }}>⌨️</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>by</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.2px" }}>Vishesh Barot</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>© 2025 FlowCollab</span>
      </footer>

    </div>
  );
}
