import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useState, useRef, memo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, push, serverTimestamp, onDisconnect, get, remove } from "firebase/database";

// ✅ FIX 1: Sare panels Room ke BAHAR define kiye — memo se wrap kiye
// Isliye ab yeh components har files/messages state change pe re-create nahi honge
// Yahi problem thi — editor focus lose karta tha aur file content show nahi hoti thi

const MarkdownMessage = memo(({ text }) => (
  <ReactMarkdown
    children={text}
    components={{
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        return !inline ? (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match ? match[1] : "plaintext"}
            PreTag="div"
            customStyle={{ margin: "8px 0", borderRadius: 6, fontSize: 11.5, padding: "10px 14px", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)" }}
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        ) : (
          <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: 3, fontSize: 11.5, fontFamily: "monospace" }} {...props}>
            {children}
          </code>
        );
      },
      p({ children }) { return <p style={{ margin: "4px 0", lineHeight: 1.6 }}>{children}</p>; },
      ul({ children }) { return <ul style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ul>; },
      ol({ children }) { return <ol style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ol>; },
      li({ children }) { return <li style={{ margin: "2px 0" }}>{children}</li>; },
      strong({ children }) { return <strong style={{ color: "rgba(255,255,255,0.95)" }}>{children}</strong>; },
      h1({ children }) { return <h1 style={{ fontSize: 14, fontWeight: 600, margin: "6px 0 4px" }}>{children}</h1>; },
      h2({ children }) { return <h2 style={{ fontSize: 13, fontWeight: 600, margin: "6px 0 4px" }}>{children}</h2>; },
      h3({ children }) { return <h3 style={{ fontSize: 12, fontWeight: 600, margin: "6px 0 4px" }}>{children}</h3>; },
    }}
  />
));

// ✅ FileExplorerPanel — memo nahi, files change pe re-render chahiye
const FileExplorerPanel = ({
  files, activeFile, showNewFileInput, newFileName, newFileInputRef,
  onFileClick, onDeleteFile, onCreateFile, onNewFileName,
  onShowNewFileInput, onHideNewFileInput, onFileUpload, members, isMobile, setMobileTab
}) => {
  const colors = ["#6366f1", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
  const memberList = Object.entries(members);

  return (
    <div style={{ background: "#080808", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Explorer</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button title="New file" onClick={() => { onShowNewFileInput(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          <label style={{ cursor: "pointer" }} title="Import files">
            <input type="file" style={{ display: "none" }} onChange={onFileUpload} multiple
              accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.txt,.md,.cpp,.c,.java,.go,.rs,.php,.rb,.swift" />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" style={{ display: "block" }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </label>
        </div>
      </div>

      {showNewFileInput && (
        <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            ref={newFileInputRef}
            className="new-file-input"
            placeholder="filename.js"
            value={newFileName}
            onChange={e => onNewFileName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") onCreateFile();
              if (e.key === "Escape") onHideNewFileInput();
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button onClick={onCreateFile}
              style={{ flex: 1, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 3, padding: "3px 0", fontSize: 10, color: "rgba(180,190,255,0.9)", cursor: "pointer" }}>
              Create
            </button>
            <button onClick={onHideNewFileInput}
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "3px 0", fontSize: 10, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="fc-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {Object.keys(files).length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7 }}>
            No files yet.<br />Click 📄 to create or + to import.
          </div>
        ) : (
          Object.keys(files).map(name => (
            <div key={name} className={`file-item ${activeFile === name ? "active" : ""}`} onClick={() => onFileClick(name)}>
              <div style={{ width: 5, height: 5, background: activeFile === name ? "#28c840" : "rgba(255,255,255,0.2)", borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {files[name]?.name || name}
              </span>
              <button className="delete-btn" onClick={(e) => onDeleteFile(e, name)} title="Remove">✕</button>
            </div>
          ))
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 14px", flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Team</div>
        {memberList.map(([uid, m], i) => (
          <div key={uid} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 18, height: 18, background: colors[i % colors.length], borderRadius: "50%", fontSize: 8.5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>
              {m.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{m.name}</span>
            <div style={{ width: 5, height: 5, background: "#28c840", borderRadius: "50%", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ EditorPanel — memo se wrap, activeFileContent directly prop se aata hai
const EditorPanel = memo(({ activeFile, activeFileContent, files, onCodeChange, isMobile, onShowNewFileInput, onFileUpload, setMobileTab }) => {
  const getLanguage = (filename) => {
    const ext = (files[filename]?.name || filename).split(".").pop().toLowerCase();
    const map = {
      js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
      py: "python", html: "html", css: "css", json: "json", md: "markdown",
      cpp: "cpp", c: "c", java: "java", go: "go", rs: "rust", php: "php",
      rb: "ruby", swift: "swift", txt: "plaintext"
    };
    return map[ext] || "plaintext";
  };

  return (
    <div style={{ background: "#0d0d0d", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {activeFile ? (
        <>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, background: "#28c840", borderRadius: "50%" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {files[activeFile]?.name || activeFile}
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
              by {files[activeFile]?.updatedBy}
            </span>
          </div>
          <Editor
            height="100%"
            language={getLanguage(activeFile)}
            value={activeFileContent}
            onChange={onCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'SF Mono','Fira Code',monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              roundedSelection: true,
              automaticLayout: true, // ✅ Fix: resize sahi se hoga
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 16 }
            }}
          />
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.7 }}>
            No file selected.<br />Create or import a file.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { onShowNewFileInput(); if (isMobile) setMobileTab("files"); }}
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 5, padding: "6px 14px", fontSize: 11.5, color: "rgba(180,190,255,0.8)", cursor: "pointer" }}>
              + New File
            </button>
            <label style={{ cursor: "pointer" }}>
              <input type="file" style={{ display: "none" }} onChange={onFileUpload} multiple
                accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.txt,.md,.cpp,.c,.java,.go,.rs,.php,.rb,.swift" />
              <span className="import-btn">Import</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

// ✅ ChatPanel — memo se wrap
const ChatPanel = memo(({
  messages, newMessage, aiLoading, pendingChange, typingUsers,
  files, user, onSendMessage, onNewMessage, onTyping, onApplyPending, onCancelPending, messagesEndRef
}) => (
  <div style={{ background: "#080808", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
    <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <svg width="11" height="11" viewBox="0 0 22 22" fill="none">
        <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <circle cx="11" cy="11" r="2" fill="rgba(255,255,255,0.5)" />
      </svg>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Team Chat + AI</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
        {aiLoading && <div style={{ width: 6, height: 6, background: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />}
        <div style={{ width: 6, height: 6, background: "#28c840", borderRadius: "50%" }} />
      </div>
    </div>

    <div style={{ padding: "6px 12px", background: "rgba(99,102,241,0.05)", borderBottom: "1px solid rgba(99,102,241,0.1)", flexShrink: 0 }}>
      <span style={{ fontSize: 10.5, color: "rgba(99,102,241,0.7)" }}>
        💡 Use <code style={{ background: "rgba(99,102,241,0.15)", padding: "1px 5px", borderRadius: 3 }}>@ai</code> to ask AI
      </span>
    </div>

    {pendingChange && (
      <div className="pending-banner">
        <svg width="10" height="10" viewBox="0 0 22 22" fill="none">
          <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(180,190,255,0.8)" strokeWidth="1.5" />
          <circle cx="11" cy="11" r="2" fill="rgba(180,190,255,0.8)" />
        </svg>
        <span style={{ flex: 1, fontSize: 11 }}>
          AI wants to edit <strong>{files[pendingChange.fileName]?.name || pendingChange.fileName}</strong>
        </span>
        <button className="yes-btn" onClick={onApplyPending}>Apply ✓</button>
        <button className="no-btn" onClick={onCancelPending}>Cancel ✕</button>
      </div>
    )}

    <div className="fc-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
      {messages.length === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
          No messages yet.<br />Start the conversation!
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 12, animation: "slideIn 0.2s ease" }}>
            <div style={{ fontSize: 10, color: msg.type === "ai" ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.25)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
              {msg.type === "ai" && (
                <svg width="8" height="8" viewBox="0 0 22 22" fill="none">
                  <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(99,102,241,0.7)" strokeWidth="1.5" />
                  <circle cx="11" cy="11" r="2" fill="rgba(99,102,241,0.7)" />
                </svg>
              )}
              {msg.sender}
            </div>
            <div style={{
              background: msg.type === "ai" ? "rgba(99,102,241,0.08)" : msg.uid === user?.uid ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${msg.type === "ai" ? "rgba(99,102,241,0.2)" : msg.uid === user?.uid ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 6, padding: "8px 10px"
            }}>
              {msg.type === "ai" ? (
                <div className="ai-markdown"><MarkdownMessage text={msg.text} /></div>
              ) : (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {aiLoading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "rgba(99,102,241,0.7)", marginBottom: 3 }}>AI thinking...</div>
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "8px 10px", display: "flex", gap: 4, alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 5, height: 5, background: "rgba(99,102,241,0.6)", borderRadius: "50%", animation: `spin 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      )}

      {Object.values(typingUsers).length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 4, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: "50%", animation: `spin 1s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>
            {Object.values(typingUsers).map(u => u.name).join(", ")} typing...
          </span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>

    <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
      <input
        className="msg-input"
        placeholder={pendingChange ? "Type yes/no..." : "Message or @ai ..."}
        value={newMessage}
        onChange={e => { onNewMessage(e.target.value); onTyping(); }}
        onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSendMessage()}
      />
      <button className="send-btn" onClick={onSendMessage} disabled={aiLoading}>
        {aiLoading ? "..." : "Send"}
      </button>
    </div>
  </div>
));

// ✅ Main Room component
export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [activeFileContent, setActiveFileContent] = useState("");
  const [roomExists, setRoomExists] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [mobileTab, setMobileTab] = useState("editor");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const filesRef = useRef({});
  useEffect(() => { filesRef.current = files; }, [files]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const newFileInputRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const activeFileRef = useRef(null);
  // ✅ FIX 2: isLocalEdit ref — jab hum khud type kar rahe hain toh Firebase se content update nahi hoga
  const isLocalEditRef = useRef(false);

  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) {
        navigate("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user || !roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const memberRef = ref(db, `rooms/${roomId}/members/${user.uid}`);

    onValue(roomRef, (snap) => {
      if (!snap.exists()) { setRoomExists(false); return; }
    }, { onlyOnce: true });

    get(memberRef).then((snap) => {
      set(memberRef, {
        name: user.displayName || user.email,
        email: user.email,
        joinedAt: snap.exists() ? snap.val().joinedAt : serverTimestamp(),
        online: true,
      }).then(() => { onDisconnect(memberRef).remove(); });
    });

    const unsubMembers = onValue(ref(db, `rooms/${roomId}/members`), (snap) => setMembers(snap.val() || {}));

    const unsubMsgs = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(arr);
      } else setMessages([]);
    });

    // ✅ Firebase files sync — setFiles directly, Firebase is source of truth
    const unsubFiles = onValue(ref(db, `rooms/${roomId}/files`), (snap) => {
      const data = snap.val() || {};
      setFiles(data);
      // Active file content update karo — sirf jab local edit nahi ho raha
      if (activeFileRef.current && data[activeFileRef.current] && !isLocalEditRef.current) {
        setActiveFileContent(data[activeFileRef.current].content || "");
      }
      // Agar active file delete ho gayi toh clear karo
      if (activeFileRef.current && !data[activeFileRef.current]) {
        setActiveFile(null);
        setActiveFileContent("");
      }
    });

    const unsubTyping = onValue(ref(db, `rooms/${roomId}/typing`), (snap) => {
      const data = snap.val() || {};
      const others = Object.entries(data)
        .filter(([uid]) => uid !== user.uid)
        .reduce((acc, [uid, val]) => ({ ...acc, [uid]: val }), {});
      setTypingUsers(others);
    });

    return () => { unsubMembers(); unsubMsgs(); unsubFiles(); unsubTyping(); };
  }, [user, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const aiMsgs = messages.filter(m => m.type === "ai" || m.type === "user");
    conversationHistoryRef.current = aiMsgs.slice(-20).map(m => ({
      role: m.type === "ai" ? "assistant" : "user",
      content: m.text
    }));
  }, [messages]);

  useEffect(() => {
    if (showNewFileInput && newFileInputRef.current) newFileInputRef.current.focus();
  }, [showNewFileInput]);

  // ✅ FIX: sanitizeFileName — Firebase keys mein dot allowed nahi
  // Isliye dot ko '__' se replace karo key mein, but 'name' field mein original naam store hoga
  const sanitizeFileName = useCallback((name) => {
    // Firebase key: saare special chars + dot bhi replace karo
    return name
      .replace(/[#$[\].\s]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 100) || 'untitled';
  }, []);

  const handleLeaveRoom = async () => {
    try { await remove(ref(db, `rooms/${roomId}/members/${user.uid}`)); } catch (err) { console.error(err); }
    navigate("/dashboard");
  };

  const handleTyping = useCallback(() => {
    if (!user || !roomId) return;
    const typingRef = ref(db, `rooms/${roomId}/typing/${user.uid}`);
    set(typingRef, { name: user.displayName || user.email, timestamp: serverTimestamp() });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => remove(typingRef), 2000);
  }, [user, roomId]);

  const handleCreateNewFile = async () => {
    const name = newFileName.trim();
    if (!name) return;
    const safeName = sanitizeFileName(name);
    const currentUser = userRef.current;
    try {
      const fileRef = ref(db, `rooms/${roomId}/files/${safeName}`);
      const existing = await get(fileRef);
      if (existing.exists()) { alert("File already exists!"); return; }
      const newFileObj = { name, content: "", updatedBy: currentUser?.displayName || currentUser?.email || "Unknown" };
      // ✅ Locally files state update karo — Explorer mein turant dikhega
      setFiles(prev => ({ ...prev, [safeName]: newFileObj }));
      setActiveFile(safeName);
      setActiveFileContent("");
      setNewFileName("");
      setShowNewFileInput(false);
      if (isMobile) setMobileTab("editor");
      // Firebase save — onValue se sync hoga automatically
      set(fileRef, newFileObj).catch(err => console.error(err));
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = useCallback((e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;
    uploadedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target.result;
        const safeName = sanitizeFileName(file.name);
        const currentUser = userRef.current;
        const newFileObj = { name: file.name, content, updatedBy: currentUser?.displayName || currentUser?.email || "Unknown" };
        try {
          // ✅ Pehle files state locally update karo — Explorer mein turant dikhega
          setFiles(prev => ({ ...prev, [safeName]: newFileObj }));
          if (index === 0) {
            setActiveFile(safeName);
            setActiveFileContent(content);
            isLocalEditRef.current = true;
            if (isMobile) setMobileTab("editor");
          }
          // Phir Firebase mein save karo
          await set(ref(db, `rooms/${roomId}/files/${safeName}`), newFileObj);
        } catch (err) {
          console.error("File upload error:", err);
        } finally {
          if (index === 0) {
            setTimeout(() => { isLocalEditRef.current = false; }, 1000);
          }
        }
      };
      reader.readAsText(file);
    });
    e.target.value = "";
  }, [roomId, isMobile, sanitizeFileName]);

  const handleDeleteFile = useCallback(async (e, name) => {
    e.stopPropagation();
    try {
      await remove(ref(db, `rooms/${roomId}/files/${name}`));
      if (activeFile === name) { setActiveFile(null); setActiveFileContent(""); }
    } catch (err) { console.error(err); }
  }, [roomId, activeFile]);

  const handleFileClick = useCallback((name) => {
    setActiveFile(name);
    setActiveFileContent(files[name]?.content || ""); // ✅ Click par seedha content set
    if (isMobile) setMobileTab("editor");
  }, [files, isMobile]);

  // ✅ FIX 2: isLocalEditRef set karo typing ke waqt
  const handleCodeChange = useCallback((val) => {
    const value = val || "";
    setActiveFileContent(value);
    isLocalEditRef.current = true;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (activeFileRef.current) {
        try {
          await set(ref(db, `rooms/${roomId}/files/${activeFileRef.current}`), {
            name: filesRef.current[activeFileRef.current]?.name || activeFileRef.current,
            content: value,
            updatedBy: user?.displayName || user?.email
          });
        } catch (err) { console.error(err); }
      }
      isLocalEditRef.current = false;
    }, 800);
  }, [roomId, user]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage("");
    const cleanText = text.toLowerCase().replace("@ai", "").trim();

    if (pendingChange && (cleanText === "yes" || cleanText === "haan" || cleanText === "y")) {
      await push(ref(db, `rooms/${roomId}/messages`), { text, sender: user.displayName || user.email, uid: user.uid, type: "user", timestamp: serverTimestamp() });
      await applyPendingChange(); return;
    }
    if (pendingChange && (cleanText === "no" || cleanText === "nahi" || cleanText === "n")) {
      setPendingChange(null);
      await push(ref(db, `rooms/${roomId}/messages`), { text, sender: user.displayName || user.email, uid: user.uid, type: "user", timestamp: serverTimestamp() });
      await push(ref(db, `rooms/${roomId}/messages`), { text: "Okay, no changes made. Let me know if you need anything else!", sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
      return;
    }

    await push(ref(db, `rooms/${roomId}/messages`), { text, sender: user.displayName || user.email, uid: user.uid, type: "user", timestamp: serverTimestamp() });
    if (text.toLowerCase().startsWith("@ai")) await handleAIMessage(text.slice(3).trim());
  };

  const applyPendingChange = async () => {
    if (!pendingChange) return;
    const { fileName, newContent } = pendingChange;
    try {
      await set(ref(db, `rooms/${roomId}/files/${fileName}`), {
        name: files[fileName]?.name || fileName,
        content: newContent,
        updatedBy: "AI"
      });
      if (activeFile === fileName) setActiveFileContent(newContent);
      setPendingChange(null);
      await push(ref(db, `rooms/${roomId}/messages`), {
        text: `✅ Changes applied to **${files[fileName]?.name || fileName}** successfully!`,
        sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp()
      });
    } catch (err) {
      await push(ref(db, `rooms/${roomId}/messages`), {
        text: "❌ Failed to apply changes: " + err.message,
        sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp()
      });
    }
  };

  const handleAIMessage = async (userQuery) => {
    setAiLoading(true);
    const keySnap = await get(ref(db, `users/${user.uid}/apiKey`));
    if (!keySnap.exists()) {
      await push(ref(db, `rooms/${roomId}/messages`), {
        text: "⚠️ No API key found. Please add your API key in the Dashboard first.",
        sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp()
      });
      setAiLoading(false); return;
    }

    const { key, provider } = keySnap.val();
    const fileContext = Object.entries(files).map(([safeName, f]) =>
      `File: ${f.name || safeName}\n\`\`\`\n${f.content || ""}\n\`\`\``
    ).join("\n\n");
    const memberNames = Object.values(members).map(m => m.name).join(", ");
    const systemPrompt = `You are an AI coding assistant embedded in FlowCollab — a real-time collaborative coding tool.\n\nTeam members online: ${memberNames}\n\nProject files (FULL CONTENT):\n${fileContext || "No files uploaded yet."}\n\nIMPORTANT RULES:\n1. You ONLY respond when directly mentioned with @ai\n2. You remember the full conversation history\n3. You know ALL project files\n4. If asked to change a file, respond with explanation + COMPLETE updated file in code block + "Should I apply this change? (yes/no)"\n5. Keep responses concise\n6. Always respond in the same language the user used`;

    try {
      let aiResponse = "";
      const history = conversationHistoryRef.current;

      if (provider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 2048, system: systemPrompt, messages: [...history, { role: "user", content: userQuery }] })
        });
        const data = await res.json();
        aiResponse = data.content?.[0]?.text || "No response from Claude.";

      } else if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userQuery }] })
        });
        const data = await res.json();
        aiResponse = data.choices?.[0]?.message?.content || "No response from GPT-4.";

      } else if (provider === "gemini") {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`)}`;
        const historyText = history.map(h => `${h.role === "user" ? "User" : "AI"}: ${h.content}`).join("\n");
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\nConversation history:\n" + historyText + "\n\nUser: " + userQuery }] }] })
        });
        const data = await res.json();
        aiResponse = data.error?.code === 429
          ? "❌ Quota exceeded — try again tomorrow."
          : data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";

      } else if (provider === "groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 2048, messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userQuery }] })
        });
        const data = await res.json();
        aiResponse = data.choices?.[0]?.message?.content || "No response from Groq.";
      }

      const codeBlockMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);
      const wantsToApply = aiResponse.toLowerCase().includes("should i apply") || aiResponse.toLowerCase().includes("apply this change");
      if (codeBlockMatch && wantsToApply) {
        const newContent = codeBlockMatch[1];
        let targetFile = activeFile;
        for (const fKey of Object.keys(files)) {
          if (aiResponse.toLowerCase().includes((files[fKey]?.name || fKey).toLowerCase())) {
            targetFile = fKey; break;
          }
        }
        if (targetFile) setPendingChange({ fileName: targetFile, newContent });
      }

      await push(ref(db, `rooms/${roomId}/messages`), {
        text: aiResponse, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp()
      });
    } catch (err) {
      await push(ref(db, `rooms/${roomId}/messages`), {
        text: "❌ AI error: " + err.message, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp()
      });
    }
    setAiLoading(false);
  };

  if (!roomExists) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "white" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Room not found</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>This room doesn't exist or has been deleted.</p>
        <button onClick={() => navigate("/dashboard")} style={{ background: "white", color: "black", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Go to Dashboard</button>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{ background: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 20, height: 20, border: "1.5px solid rgba(255,255,255,0.15)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const memberList = Object.entries(members);
  const colors = ["#6366f1", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

  return (
    <div style={{ background: "#000", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", color: "white", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fc-scrollbar::-webkit-scrollbar { width: 4px; }
        .fc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .fc-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .file-item { padding: 5px 8px 5px 20px; font-size: 11.5px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 5px; cursor: pointer; transition: background .15s, color .15s; border-radius: 4px; margin: 1px 6px; }
        .file-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
        .file-item:hover .delete-btn { opacity: 1 !important; }
        .file-item.active { background: rgba(255,255,255,0.07); color: white; }
        .delete-btn { opacity: 0; transition: opacity .15s; margin-left: auto; padding: 1px 4px; background: none; border: none; color: rgba(255,100,100,0.7); cursor: pointer; font-size: 12px; border-radius: 3px; flex-shrink: 0; }
        .delete-btn:hover { background: rgba(255,50,50,0.15); color: #ff5f57; }
        .msg-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 12px; font-size: 12.5px; color: white; outline: none; flex: 1; transition: border-color .2s; }
        .msg-input:focus { border-color: rgba(255,255,255,0.2); }
        .msg-input::placeholder { color: rgba(255,255,255,0.2); }
        .send-btn { background: white; color: black; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: opacity .2s; white-space: nowrap; }
        .send-btn:hover { opacity: 0.85; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .import-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 4px 10px; font-size: 11px; color: rgba(255,255,255,0.5); cursor: pointer; transition: all .15s; white-space: nowrap; display: inline-block; }
        .import-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .pending-banner { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; padding: 8px 12px; margin: 8px 12px; font-size: 11.5px; color: rgba(180,190,255,0.9); display: flex; align-items: center; gap: 8px; }
        .yes-btn { background: rgba(40,200,64,0.15); border: 1px solid rgba(40,200,64,0.3); color: #28c840; border-radius: 4px; padding: 3px 10px; font-size: 11px; cursor: pointer; }
        .no-btn { background: rgba(255,95,87,0.1); border: 1px solid rgba(255,95,87,0.25); color: #ff5f57; border-radius: 4px; padding: 3px 10px; font-size: 11px; cursor: pointer; }
        .leave-btn { background: rgba(255,95,87,0.08); border: 1px solid rgba(255,95,87,0.2); border-radius: 5px; padding: 4px 12px; font-size: 11px; color: rgba(255,95,87,0.7); cursor: pointer; margin-left: 8px; transition: all .15s; }
        .leave-btn:hover { background: rgba(255,95,87,0.18); color: #ff5f57; }
        .ai-markdown { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6; word-break: break-word; }
        .ai-markdown p:first-child { margin-top: 0; }
        .ai-markdown p:last-child { margin-bottom: 0; }
        .new-file-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(99,102,241,0.4); border-radius: 4px; padding: 4px 8px; font-size: 11px; color: white; outline: none; width: 100%; box-sizing: border-box; }
        .new-file-input::placeholder { color: rgba(255,255,255,0.25); }
        .mob-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 10px 0; font-size: 11px; color: rgba(255,255,255,0.35); cursor: pointer; border-top: 2px solid transparent; transition: all .15s; background: none; border-left: none; border-right: none; border-bottom: none; }
        .mob-tab.active { color: white; border-top-color: white; }
      `}</style>

      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 52, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.2" fill="none" />
              <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.15" />
              <circle cx="11" cy="11" r="2" fill="white" />
            </svg>
            {!isMobile && <span style={{ fontSize: 14, fontWeight: 500 }}>FlowCollab</span>}
          </div>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
          <code style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>
            {isMobile ? roomId?.slice(0, 8) + "..." : roomId}
          </code>
          {!isMobile && (
            <button onClick={() => {
              const link = `${window.location.origin}/room/${roomId}`;
              navigator.clipboard.writeText(link).catch(() => alert("Link: " + link));
              alert("Invite link copied!");
            }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
              Copy invite
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {memberList.slice(0, isMobile ? 3 : 5).map(([uid, m], i) => (
            <div key={uid} title={m.name} style={{ width: 24, height: 24, background: colors[i % colors.length], borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, border: "2px solid #000" }}>
              {m.name?.[0]?.toUpperCase()}
            </div>
          ))}
          {!isMobile && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{memberList.length} online</span>}
          <button className="leave-btn" onClick={handleLeaveRoom}>← {isMobile ? "" : "Leave"}</button>
        </div>
      </nav>

      {isMobile ? (
        <>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {mobileTab === "files" && (
              <FileExplorerPanel
                files={files} activeFile={activeFile} showNewFileInput={showNewFileInput}
                newFileName={newFileName} newFileInputRef={newFileInputRef}
                onFileClick={handleFileClick} onDeleteFile={handleDeleteFile}
                onCreateFile={handleCreateNewFile} onNewFileName={setNewFileName}
                onShowNewFileInput={() => { setShowNewFileInput(true); setNewFileName(""); }}
                onHideNewFileInput={() => { setShowNewFileInput(false); setNewFileName(""); }}
                onFileUpload={handleFileUpload} members={members} isMobile={isMobile} setMobileTab={setMobileTab}
              />
            )}
            {mobileTab === "editor" && (
              <EditorPanel
                activeFile={activeFile} activeFileContent={activeFileContent}
                files={files} onCodeChange={handleCodeChange} isMobile={isMobile}
                onShowNewFileInput={() => { setShowNewFileInput(true); setNewFileName(""); }}
                onFileUpload={handleFileUpload} setMobileTab={setMobileTab}
              />
            )}
            {mobileTab === "chat" && (
              <ChatPanel
                messages={messages} newMessage={newMessage} aiLoading={aiLoading}
                pendingChange={pendingChange} typingUsers={typingUsers} files={files} user={user}
                onSendMessage={sendMessage} onNewMessage={setNewMessage} onTyping={handleTyping}
                onApplyPending={applyPendingChange} onCancelPending={() => setPendingChange(null)}
                messagesEndRef={messagesEndRef}
              />
            )}
          </div>
          <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.08)", background: "#080808", flexShrink: 0 }}>
            <button className={`mob-tab ${mobileTab === "files" ? "active" : ""}`} onClick={() => setMobileTab("files")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              Files
            </button>
            <button className={`mob-tab ${mobileTab === "editor" ? "active" : ""}`} onClick={() => setMobileTab("editor")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Editor
            </button>
            <button className={`mob-tab ${mobileTab === "chat" ? "active" : ""}`} onClick={() => setMobileTab("chat")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Chat
              {messages.length > 0 && mobileTab !== "chat" && <span style={{ width: 6, height: 6, background: "#6366f1", borderRadius: "50%", marginLeft: 2 }} />}
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr 300px", overflow: "hidden" }}>
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <FileExplorerPanel
              files={files} activeFile={activeFile} showNewFileInput={showNewFileInput}
              newFileName={newFileName} newFileInputRef={newFileInputRef}
              onFileClick={handleFileClick} onDeleteFile={handleDeleteFile}
              onCreateFile={handleCreateNewFile} onNewFileName={setNewFileName}
              onShowNewFileInput={() => { setShowNewFileInput(true); setNewFileName(""); }}
              onHideNewFileInput={() => { setShowNewFileInput(false); setNewFileName(""); }}
              onFileUpload={handleFileUpload} members={members} isMobile={isMobile} setMobileTab={setMobileTab}
            />
          </div>
          <div style={{ overflow: "hidden" }}>
            <EditorPanel
              activeFile={activeFile} activeFileContent={activeFileContent}
              files={files} onCodeChange={handleCodeChange} isMobile={isMobile}
              onShowNewFileInput={() => { setShowNewFileInput(true); setNewFileName(""); }}
              onFileUpload={handleFileUpload} setMobileTab={setMobileTab}
            />
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <ChatPanel
              messages={messages} newMessage={newMessage} aiLoading={aiLoading}
              pendingChange={pendingChange} typingUsers={typingUsers} files={files} user={user}
              onSendMessage={sendMessage} onNewMessage={setNewMessage} onTyping={handleTyping}
              onApplyPending={applyPendingChange} onCancelPending={() => setPendingChange(null)}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}
