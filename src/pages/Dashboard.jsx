
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, push, serverTimestamp, set, get, onValue, remove } from "firebase/database";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState("groq");
  const [keySaved, setKeySaved] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [myRooms, setMyRooms] = useState([]);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        navigate("/login");
      } else {
        setUser(currentUser);
        get(ref(db, `users/${currentUser.uid}/apiKey`)).then((snap) => {
          if (snap.exists()) {
            const { key, provider } = snap.val();
            setApiKey(key);
            setApiProvider(provider);
          }
        });

        const roomsRef = ref(db, "rooms");
        onValue(roomsRef, (snap) => {
          if (!snap.exists()) { setMyRooms([]); return; }
          const all = snap.val();
          const mine = Object.entries(all)
            .filter(([id, room]) => room.createdBy === currentUser.uid)
            .map(([id, room]) => ({ id, ...room }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setMyRooms(mine);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleCreateRoom = async () => {
    setCreating(true);
    const roomsRef = ref(db, "rooms");
    const newRoom = await push(roomsRef, {
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      name: `${user.displayName || user.email}'s Room`,
    });
    navigate(`/room/${newRoom.key}`);
    setCreating(false);
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    navigate(`/room/${roomCode.trim()}`);
  };

  // ✅ Room delete karo
  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? This will permanently delete the room and all its files.")) return;
    setDeletingRoom(roomId);
    try {
      await remove(ref(db, `rooms/${roomId}`));
    } catch (err) {
      console.error("Delete room error:", err);
    }
    setDeletingRoom(null);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setKeySaved(false);
    setKeyError("");
    let isValid = false;
    let errorMsg = "";

    try {
      if (apiProvider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }]
          })
        });
        const data = await res.json();
        if (data.content) isValid = true;
        else errorMsg = data.error?.message || "Invalid Claude API key";

      } else if (apiProvider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-3.5-turbo", max_tokens: 10, messages: [{ role: "user", content: "hi" }] })
        });
        const data = await res.json();
        if (data.choices) isValid = true;
        else errorMsg = data.error?.message || "Invalid OpenAI API key";

      } else if (apiProvider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        const data = await res.json();
        if (data.candidates) isValid = true;
        else if (data.error?.code === 429) errorMsg = "❌ Quota exceeded — try again tomorrow or use a new key";
        else errorMsg = data.error?.message || "Invalid Gemini API key";

      } else if (apiProvider === "groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 10, messages: [{ role: "user", content: "hi" }] })
        });
        const data = await res.json();
        if (data.choices) isValid = true;
        else errorMsg = data.error?.message || "Invalid Groq API key";
      }

    } catch (err) {
      errorMsg = "Connection error — check your internet";
    }

    if (isValid) {
      const keyRef = ref(db, `users/${user.uid}/apiKey`);
      await set(keyRef, { provider: apiProvider, key: apiKey, updatedAt: serverTimestamp() });
      setKeySaved(true);
      setKeyError("");
      setTimeout(() => setKeySaved(false), 3000);
    } else {
      setKeyError(errorMsg);
    }
  };

  if (!user) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 20, height: 20, border: "1.5px solid rgba(255,255,255,0.15)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "white" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orb1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
        @keyframes orb2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,40px); } }
        .room-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px; transition: border-color .2s, transform .2s; }
        .room-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .my-room-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: border-color .15s, background .15s; cursor: pointer; }
        .my-room-item:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
        .my-room-item:hover .del-room-btn { opacity: 1 !important; }
        .open-btn { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 4px 12px; font-size: 11px; color: rgba(255,255,255,0.5); cursor: pointer; transition: all .15s; white-space: nowrap; }
        .open-btn:hover { background: rgba(255,255,255,0.12); color: white; }
        .copy-btn { background: none; border: none; color: rgba(255,255,255,0.25); cursor: pointer; font-size: 11px; padding: 2px 6px; border-radius: 4px; transition: color .15s; }
        .copy-btn:hover { color: rgba(255,255,255,0.6); }
        .del-room-btn { opacity: 0; background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.2); border-radius: 4px; padding: 3px 8px; font-size: 10px; color: rgba(255,95,87,0.6); cursor: pointer; transition: all .15s; white-space: nowrap; }
        .del-room-btn:hover { background: rgba(255,95,87,0.2); color: #ff5f57; }
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
          <defs><pattern id="sg4" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.3" opacity="0.04" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#sg4)" />
        </svg>
      </div>

      {/* Navbar */}
      <nav style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.8)", animation: "fadeIn 0.4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.2" fill="none" />
            <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.15" />
            <circle cx="11" cy="11" r="2" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.2px" }}>FlowCollab</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "rgba(255,255,255,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>
              {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{user.displayName || user.email}</span>
          </div>
          <button onClick={handleLogout}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "border-color .2s, color .2s" }}
            onMouseOver={e => { e.target.style.borderColor = "rgba(255,255,255,0.25)"; e.target.style.color = "white"; }}
            onMouseOut={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.4)"; }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <div style={{ position: "relative", zIndex: 5, maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>

        <div className="a1" style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-1px", marginBottom: 6 }}>
            Good to see you, {user.displayName ? user.displayName.split(" ")[0] : "there"} 👋
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Create a room or join an existing one to start collaborating.</p>
        </div>

        <div className="a2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          <div className="room-card">
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Create a room</h3>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>Start a new collaboration session. Get a unique invite link to share with your team.</p>
            <div style={{ marginTop: 16 }}>
              <button onClick={handleCreateRoom}
                style={{ background: "white", color: "black", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "opacity .2s" }}
                onMouseOver={e => e.target.style.opacity = "0.85"}
                onMouseOut={e => e.target.style.opacity = "1"}>
                {creating ? "Creating..." : "Create room →"}
              </button>
            </div>
          </div>

          <div className="room-card">
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Join a room</h3>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>Have an invite link? Enter the room code below to join your team's session.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <input
                placeholder="Room code..."
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoinRoom()}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 12.5, color: "white", outline: "none", flex: 1 }}
              />
              <button onClick={handleJoinRoom} style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 14px", fontSize: 12.5, cursor: "pointer" }}>
                Join
              </button>
            </div>
          </div>
        </div>

        {/* My Rooms */}
        <div className="a3" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>My Rooms</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Rooms you have created</p>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2px 10px" }}>
              {myRooms.length} room{myRooms.length !== 1 ? "s" : ""}
            </span>
          </div>

          {myRooms.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "24px", textAlign: "center" }}>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.2)" }}>No rooms yet — create your first one above!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myRooms.map((room) => (
                <div key={room.id} className="my-room-item" onClick={() => navigate(`/room/${room.id}`)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 22 22" fill="none">
                        <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(99,102,241,0.8)" strokeWidth="1.5" fill="none" />
                        <circle cx="11" cy="11" r="2" fill="rgba(99,102,241,0.8)" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{room.name || "Unnamed Room"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <code style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{room.id}</code>
                        <button className="copy-btn" onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/room/${room.id}`;
                          try {
                            const el = document.createElement("textarea");
                            el.value = link;
                            document.body.appendChild(el);
                            el.select();
                            document.execCommand("copy");
                            document.body.removeChild(el);
                            alert("Invite link copied!");
                          } catch(err) { alert("Link: " + link); }
                        }}>📋 copy link</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* ✅ Delete button */}
                    <button
                      className="del-room-btn"
                      onClick={(e) => handleDeleteRoom(e, room.id)}
                      disabled={deletingRoom === room.id}
                    >
                      {deletingRoom === room.id ? "Deleting..." : "🗑 Delete"}
                    </button>
                    <button className="open-btn" onClick={(e) => { e.stopPropagation(); navigate(`/room/${room.id}`); }}>
                      Open →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="a4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>AI Provider</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Add your API key to use AI in collaboration rooms</p>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {["Claude", "GPT-4", "Gemini", "Groq"].map(p => (
                <span key={p} style={{ fontSize: 11, color: p === "Groq" ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.28)", border: `1px solid ${p === "Groq" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.09)"}`, borderRadius: 4, padding: "3px 9px" }}>{p}{p === "Groq" ? " ⚡" : ""}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={apiProvider} onChange={e => setApiProvider(e.target.value)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "rgba(255,255,255,0.6)", outline: "none", cursor: "pointer" }}>
              <option value="claude">Claude</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="gemini">Gemini</option>
              <option value="groq">Groq (Free) ⚡</option>
            </select>
            <input type="password" placeholder="API key..." value={apiKey} onChange={e => setApiKey(e.target.value)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "white", outline: "none", flex: 1 }} />
            <button onClick={handleSaveKey}
              style={{ background: keySaved ? "#28c840" : "white", color: "black", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "background .3s" }}>
              {keySaved ? "Saved ✓" : "Save key"}
            </button>
          </div>
          {keyError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,100,100,0.9)", background: "rgba(255,95,87,0.08)", border: "1px solid rgba(255,95,87,0.2)", borderRadius: 6, padding: "8px 12px" }}>
              {keyError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
