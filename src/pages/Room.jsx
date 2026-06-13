import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useState, useRef, memo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, push, serverTimestamp, onDisconnect, get, remove } from "firebase/database";
import { useToast } from "../hooks/useToast";

// ─── Version History Modal ────────────────────────────────────────────────────
const VersionHistoryModal = ({ versions, currentContent, fileName, onRestore, onClose }) => {
  const [selected, setSelected] = useState(versions[0] || null);

  const diffLines = (a = "", b = "") => {
    const aLines = a.split("\n");
    const bLines = b.split("\n");
    const result = [];
    const maxLen = Math.max(aLines.length, bLines.length);
    for (let i = 0; i < maxLen; i++) {
      const aLine = aLines[i] ?? null;
      const bLine = bLines[i] ?? null;
      if (aLine === bLine) result.push({ type: "same", text: aLine ?? "" });
      else {
        if (aLine !== null) result.push({ type: "removed", text: aLine });
        if (bLine !== null) result.push({ type: "added", text: bLine });
      }
    }
    return result;
  };

  const diff = selected ? diffLines(selected.content, currentContent) : [];
  const changedCount = diff.filter(l => l.type !== "same").length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: "100%", maxWidth: 860, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>Version History</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 10, fontFamily: "monospace" }}>{fileName}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar: version list */}
          <div style={{ width: 210, borderRight: "1px solid rgba(255,255,255,0.07)", overflowY: "auto", flexShrink: 0 }}>
            {versions.length === 0 ? (
              <div style={{ padding: 20, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>No saved versions yet</div>
            ) : versions.map((v, i) => {
              const date = new Date(v.savedAt);
              const isSelected = selected?.savedAt === v.savedAt;
              return (
                <div key={v.savedAt} onClick={() => setSelected(v)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", background: isSelected ? "rgba(99,102,241,0.12)" : "transparent", borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent", transition: "background .15s" }}>
                  <div style={{ fontSize: 10.5, color: isSelected ? "rgba(180,190,255,0.95)" : "rgba(255,255,255,0.6)", fontWeight: isSelected ? 600 : 400 }}>
                    {i === 0 ? "🕐 Latest save" : `Version ${versions.length - i}`}
                  </div>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {date.toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>by {v.savedBy}</div>
                </div>
              );
            })}
          </div>

          {/* Diff view */}
          <div style={{ flex: 1, overflowY: "auto", fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11.5 }}>
            {selected && (
              <>
                <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0a", flexShrink: 0 }}>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>
                    {changedCount === 0 ? "✓ No changes from current" : `${diff.filter(l => l.type === "added").length} additions · ${diff.filter(l => l.type === "removed").length} removals`}
                  </span>
                  <button onClick={() => onRestore(selected.content)}
                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 4, padding: "3px 12px", fontSize: 10.5, color: "rgba(180,190,255,0.9)", cursor: "pointer", fontFamily: "'SF Pro Display',sans-serif" }}>
                    ↩ Restore this version
                  </button>
                </div>
                <div>
                  {diff.map((line, i) => (
                    <div key={i} style={{
                      padding: "1px 16px",
                      background: line.type === "added" ? "rgba(40,200,64,0.08)" : line.type === "removed" ? "rgba(255,95,87,0.08)" : "transparent",
                      color: line.type === "added" ? "rgba(120,230,130,0.9)" : line.type === "removed" ? "rgba(255,140,135,0.9)" : "rgba(255,255,255,0.45)",
                      borderLeft: `2px solid ${line.type === "added" ? "rgba(40,200,64,0.4)" : line.type === "removed" ? "rgba(255,95,87,0.4)" : "transparent"}`,
                      whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: "1.7",
                    }}>
                      {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}{line.text}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const CURSOR_COLORS = ["#6366f1", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444"];
function colorForUid(uid = "") {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

function buildFileTree(files) {
  const root = { folders: {}, files: [] };
  Object.entries(files).forEach(([key, file]) => {
    const path = (file?.name || key).split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const part = path[i];
      if (!node.folders[part]) node.folders[part] = { folders: {}, files: [] };
      node = node.folders[part];
    }
    node.files.push({ key, label: path[path.length - 1] || key });
  });
  return root;
}

const FolderIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" style={{ flexShrink: 0 }}>
    {open
      ? <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
    }
  </svg>
);

const FileTreeNode = ({ node, depth, activeFile, onFileClick, onDeleteFile, collapsedFolders, toggleFolder, pathPrefix }) => (
  <>
    {Object.keys(node.folders).sort((a, b) => a.localeCompare(b)).map(folderName => {
      const folderPath = pathPrefix ? `${pathPrefix}/${folderName}` : folderName;
      const isOpen = !collapsedFolders.has(folderPath);
      return (
        <div key={folderPath}>
          <div className="file-item" onClick={() => toggleFolder(folderPath)} style={{ paddingLeft: 8 + depth * 12 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", width: 10, textAlign: "center", flexShrink: 0 }}>{isOpen ? "▾" : "▸"}</span>
            <FolderIcon open={isOpen} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{folderName}</span>
          </div>
          {isOpen && (
            <FileTreeNode
              node={node.folders[folderName]}
              depth={depth + 1}
              activeFile={activeFile}
              onFileClick={onFileClick}
              onDeleteFile={onDeleteFile}
              collapsedFolders={collapsedFolders}
              toggleFolder={toggleFolder}
              pathPrefix={folderPath}
            />
          )}
        </div>
      );
    })}
    {node.files.sort((a, b) => a.label.localeCompare(b.label)).map(f => (
      <div key={f.key} className={`file-item ${activeFile === f.key ? "active" : ""}`} onClick={() => onFileClick(f.key)} style={{ paddingLeft: 26 + depth * 12 }}>
        <div style={{ width: 5, height: 5, background: activeFile === f.key ? "#28c840" : "rgba(255,255,255,0.2)", borderRadius: "50%", flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.label}</span>
        <button className="delete-btn" onClick={(e) => onDeleteFile(e, f.key)} title="Remove">✕</button>
      </div>
    ))}
  </>
);

// ✅ FileExplorerPanel — search box included
const FileExplorerPanel = ({
  files, activeFile, showNewFileInput, newFileName, newFileInputRef,
  onFileClick, onDeleteFile, onCreateFile, onNewFileName,
  onShowNewFileInput, onHideNewFileInput, onFileUpload, members, isMobile, setMobileTab
}) => {
  const colors = ["#6366f1", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
  const memberList = Object.entries(members);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFolder = (path) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const filteredFiles = searchQuery.trim()
    ? Object.fromEntries(
        Object.entries(files).filter(([key, f]) =>
          (f.name || key).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : files;
  const displayTree = buildFileTree(filteredFiles);

  return (
    <div style={{ background: "#080808", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Header */}
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
          <label style={{ cursor: "pointer" }} title="Import folder">
            <input type="file" style={{ display: "none" }} onChange={onFileUpload} multiple
              webkitdirectory="" directory="" mozdirectory="" />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" style={{ display: "block" }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </label>
        </div>
      </div>

      {/* ✅ Search box */}
      <div style={{ padding: "2px 10px 6px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"
            style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="new-file-input"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 24, width: "100%", boxSizing: "border-box" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* New file input */}
      {showNewFileInput && (
        <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            ref={newFileInputRef}
            className="new-file-input"
            placeholder="folder/filename.js"
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

      {/* File tree */}
      <div className="fc-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {Object.keys(files).length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 14px", textAlign: "center", gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7 }}>
              No files yet.<br />Click 📄 to create or + to import.
            </div>
          </div>
        ) : Object.keys(filteredFiles).length === 0 ? (
          <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            No files match "{searchQuery}"
          </div>
        ) : (
          <FileTreeNode
            node={displayTree}
            depth={0}
            activeFile={activeFile}
            onFileClick={onFileClick}
            onDeleteFile={onDeleteFile}
            collapsedFolders={collapsedFolders}
            toggleFolder={toggleFolder}
            pathPrefix=""
          />
        )}
      </div>

      {/* Team members */}
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

// ✅ EditorPanel — saveStatus prop included
const EditorPanel = memo(({ activeFile, activeFileContent, files, onCodeChange, isMobile, onShowNewFileInput, onFileUpload, setMobileTab, remoteCursors, currentUid, onCursorActivity, saveStatus, onShowHistory, onRunForAll }) => {
  const toast = useToast();

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

  const [runOutput, setRunOutput] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);
  const [showStdinModal, setShowStdinModal] = useState(false);
  const [stdinValue, setStdinValue] = useState("");
  const [pendingRun, setPendingRun] = useState(null); // { ext, forAll }
  

  const JUDGE0_LANG = {
    py: 71, js: 63, jsx: 63, ts: 74, tsx: 74,
    cpp: 54, c: 50, java: 62, go: 60, rs: 73, php: 68, rb: 72,
  };

  const NEEDS_STDIN = ["py", "c", "cpp", "java", "rs", "rb"];

  const runWithJudge0 = async (code, ext, stdin = "") => {
    const langId = JUDGE0_LANG[ext];
    if (!langId) return null;
    const res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: code, language_id: langId, stdin }),
    });
    const data = await res.json();
    return data?.stdout || data?.stderr || data?.compile_output || "(no output)";
  };

  const handleRun = () => {
    const ext = (files[activeFile]?.name || activeFile).split(".").pop().toLowerCase();
    if (!JUDGE0_LANG[ext]) { toast.warning("Run not supported for this file type."); return; }
    if (NEEDS_STDIN.includes(ext)) {
      setPendingRun({ ext, forAll: false });
      setShowStdinModal(true);
    } else {
      executeRun(ext, "", false);
    }
  };

  const executeRun = async (ext, stdin, forAll) => {
    setShowStdinModal(false);
    if (!forAll) {
      setRunLoading(true); setShowOutput(true); setRunOutput("⏳ Running...");
      try {
        const output = await runWithJudge0(activeFileContent || "", ext, stdin);
        setRunOutput(output);
      } catch { setRunOutput("❌ Failed to connect to run service."); }
      setRunLoading(false);
    } else {
      onRunForAll(activeFile, activeFileContent, ext, stdin);
    }
  };

  // Resizable output drag
  const startOutputResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = outputHeight;
    const onMove = (ev) => setOutputHeight(Math.max(80, Math.min(500, startH + (startY - ev.clientY))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const canRun = activeFile && !!JUDGE0_LANG[(files[activeFile]?.name || activeFile).split(".").pop().toLowerCase()];

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const widgetsRef = useRef(new Map());
  const styleTagRef = useRef(null);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const emit = () => {
      const pos = editor.getPosition();
      const sel = editor.getSelection();
      if (!pos || !sel) return;
      onCursorActivity({
        line: pos.lineNumber, column: pos.column,
        selStartLine: sel.startLineNumber, selStartColumn: sel.startColumn,
        selEndLine: sel.endLineNumber, selEndColumn: sel.endColumn,
      });
    };
    editor.onDidChangeCursorPosition(emit);
    editor.onDidChangeCursorSelection(emit);
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeFile) return;
    try {
      const others = Object.entries(remoteCursors || {})
        .filter(([uid, c]) => uid !== currentUid && c?.file === activeFile && c?.line);
      const decorations = [];
      others.forEach(([uid, c]) => {
        const sL = c.selStartLine || c.line, sC = c.selStartColumn || c.column;
        const eL = c.selEndLine || c.line, eC = c.selEndColumn || c.column;
        if (sL !== eL || sC !== eC) {
          decorations.push({ range: new monaco.Range(sL, sC, eL, eC), options: { className: `fc-selection-${uid}` } });
        }
        decorations.push({
          range: new monaco.Range(c.line, c.column, c.line, c.column),
          options: { className: `fc-caret-${uid}`, stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }
        });
      });
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
      if (!styleTagRef.current) {
        styleTagRef.current = document.createElement("style");
        document.head.appendChild(styleTagRef.current);
      }
      styleTagRef.current.textContent = others.map(([uid, c]) => `
        .fc-caret-${uid} { border-left: 2px solid ${c.color}; margin-left: -1px; }
        .fc-selection-${uid} { background-color: ${c.color}2A; }
      `).join("\n");
      const seen = new Set();
      others.forEach(([uid, c]) => {
        seen.add(uid);
        let widget = widgetsRef.current.get(uid);
        if (!widget) {
          const domNode = document.createElement("div");
          domNode.style.cssText = `color:#fff; font-size:10px; padding:1px 6px; border-radius:4px 4px 4px 0; font-family:'SF Pro Display',sans-serif; white-space:nowrap; pointer-events:none; transform:translateY(-100%); z-index:20;`;
          widget = {
            domNode,
            position: { lineNumber: c.line, column: c.column },
            getId: () => `fc-cursor-widget-${uid}`,
            getDomNode: () => domNode,
            getPosition: () => ({ position: widget.position, preference: [monaco.editor.ContentWidgetPositionPreference.EXACT] })
          };
          widgetsRef.current.set(uid, widget);
          editor.addContentWidget(widget);
        }
        widget.domNode.style.background = c.color;
        widget.domNode.textContent = c.name || "Guest";
        widget.position = { lineNumber: c.line, column: c.column };
        editor.layoutContentWidget(widget);
      });
      for (const [uid, widget] of widgetsRef.current.entries()) {
        if (!seen.has(uid)) { editor.removeContentWidget(widget); widgetsRef.current.delete(uid); }
      }
    } catch (err) { /* editor disposed — safe to ignore */ }
  }, [remoteCursors, activeFile, currentUid]);

  useEffect(() => {
    const widgetsMap = widgetsRef.current;
    const styleTag = styleTagRef.current;
    return () => {
      const editor = editorRef.current;
      if (editor) for (const widget of widgetsMap.values()) editor.removeContentWidget(widget);
      widgetsMap.clear();
      styleTag?.remove();
    };
  }, []);

  return (
    <div style={{ background: "#0d0d0d", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", position: "relative" }}>
      {activeFile ? (
        <>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, background: "#28c840", borderRadius: "50%" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {files[activeFile]?.name || activeFile}
            </span>
            {/* ✅ Save status indicator */}
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              by {files[activeFile]?.updatedBy}
              {saveStatus === "saving" && <span style={{ color: "rgba(255,200,50,0.7)", fontSize: 9.5 }}>● Saving...</span>}
              {saveStatus === "saved" && <span style={{ color: "rgba(40,200,64,0.6)", fontSize: 9.5 }}>✓ Saved</span>}
              {saveStatus === "error" && <span style={{ color: "rgba(255,95,87,0.8)", fontSize: 9.5 }}>✕ Save failed</span>}
            </span>
            <button onClick={onShowHistory} title="Version history"
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
            </button>
            {canRun && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {/* ▶ Run — sirf apne browser mein */}
                <button onClick={handleRun} disabled={runLoading} title="Run in your browser only"
                  style={{ display: "flex", alignItems: "center", gap: 4, background: runLoading ? "rgba(40,200,64,0.06)" : "rgba(40,200,64,0.12)", border: "1px solid rgba(40,200,64,0.25)", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "#28c840", cursor: runLoading ? "default" : "pointer", transition: "background .15s" }}>
                  {runLoading
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                  }
                  {runLoading ? "Running" : "Run"}
                </button>
                {/* ⚡ Run for All — sabke chat mein output aata hai */}
                <button onClick={() => {
                  const ext = (files[activeFile]?.name || activeFile).split(".").pop().toLowerCase();
                  if (NEEDS_STDIN.includes(ext)) { setPendingRun({ ext, forAll: true }); setShowStdinModal(true); }
                  else onRunForAll(activeFile, activeFileContent, ext, "");
                }} disabled={runLoading} title="Run and share output with everyone in chat"
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "rgba(180,190,255,0.85)", cursor: runLoading ? "default" : "pointer", transition: "background .15s" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/>
                    <path d="M19 12h3M22 9l-3 3 3 3" />
                  </svg>
                  Share Run
                </button>
              </div>
            )}
            {showOutput && (
              <button onClick={() => setShowOutput(o => !o)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "3px 6px", flexShrink: 0 }}>
                {showOutput ? "▾ Output" : "▸ Output"}
              </button>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <Editor
              height="100%"
              language={getLanguage(activeFile)}
              value={activeFileContent}
              onChange={onCodeChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{ fontSize: 13, fontFamily: "'SF Mono','Fira Code',monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: "on", roundedSelection: true, automaticLayout: true, tabSize: 2, wordWrap: "on", padding: { top: 16 } }}
            />
          </div>
          {showOutput && runOutput !== null && (
            <div style={{ flexShrink: 0, height: outputHeight, borderTop: "1px solid rgba(40,200,64,0.15)", background: "#050505", display: "flex", flexDirection: "column", position: "relative" }}>
              {/* Drag handle */}
              <div onMouseDown={startOutputResize}
                style={{ position: "absolute", top: -3, left: 0, right: 0, height: 6, cursor: "ns-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(40,200,64,0.7)", letterSpacing: "1px", textTransform: "uppercase" }}>Output</span>
                  {runLoading && <span style={{ fontSize: 9.5, color: "rgba(255,200,50,0.6)", animation: "fc-pulse 1.2s ease infinite" }}>running...</span>}
                </div>
                <button onClick={() => { setShowOutput(false); setRunOutput(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.25)", padding: 0 }}>✕</button>
              </div>
              <pre style={{ flex: 1, overflowY: "auto", margin: 0, padding: "10px 14px", fontSize: 11.5, fontFamily: "'SF Mono','Fira Code',monospace", color: runOutput?.startsWith("❌") ? "#ff5f57" : "rgba(255,255,255,0.75)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {runOutput}
              </pre>
            </div>
          )}

          {/* Stdin Modal */}
          {showStdinModal && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 20, width: 340, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "white", marginBottom: 6 }}>Program Input (stdin)</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, lineHeight: 1.6 }}>
                  Your code uses <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3 }}>input()</code> — enter the values it expects, one per line.
                </div>
                <textarea
                  autoFocus
                  value={stdinValue}
                  onChange={e => setStdinValue(e.target.value)}
                  placeholder={"e.g.\n5\nhello\n42"}
                  style={{ width: "100%", minHeight: 90, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 5, padding: "8px 10px", fontSize: 12, color: "white", fontFamily: "'SF Mono',monospace", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => { executeRun(pendingRun.ext, stdinValue, pendingRun.forAll); setStdinValue(""); }}
                    style={{ flex: 1, background: "rgba(40,200,64,0.15)", border: "1px solid rgba(40,200,64,0.3)", borderRadius: 5, padding: "7px 0", fontSize: 12, color: "#28c840", cursor: "pointer", fontFamily: "'SF Pro Display',sans-serif" }}>
                    ▶ Run
                  </button>
                  <button onClick={() => { executeRun(pendingRun.ext, "", pendingRun.forAll); setStdinValue(""); }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "7px 0", fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'SF Pro Display',sans-serif" }}>
                    Skip stdin
                  </button>
                  <button onClick={() => setShowStdinModal(false)}
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "7px 10px", fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
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
            <button onClick={() => { onShowNewFileInput(); if (isMobile) setMobileTab("files"); }}
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
        <span style={{ flex: 1, fontSize: 11 }}>AI wants to edit <strong>{files[pendingChange.fileName]?.name || pendingChange.fileName}</strong></span>
        <button className="yes-btn" onClick={onApplyPending}>Apply ✓</button>
        <button className="no-btn" onClick={onCancelPending}>Cancel ✕</button>
      </div>
    )}
    <div className="fc-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
      {messages.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: 24, gap: 10, textAlign: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 1.7 }}>No messages yet.<br />Start the conversation!</div>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 12, animation: "slideIn 0.2s ease" }}>
            <div style={{ fontSize: 10, color: msg.type === "ai" ? "rgba(99,102,241,0.7)" : msg.type === "run_output" ? "rgba(40,200,64,0.6)" : msg.type === "system" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.25)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
              {msg.type === "ai" && (
                <svg width="8" height="8" viewBox="0 0 22 22" fill="none">
                  <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(99,102,241,0.7)" strokeWidth="1.5" />
                  <circle cx="11" cy="11" r="2" fill="rgba(99,102,241,0.7)" />
                </svg>
              )}
              {msg.type === "run_output" && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
              )}
              {msg.sender}
            </div>
            <div style={{
              background: msg.type === "ai" ? "rgba(99,102,241,0.08)" : msg.type === "run_output" ? "rgba(15,15,15,0.9)" : msg.type === "system" ? "rgba(255,255,255,0.02)" : msg.uid === user?.uid ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${msg.type === "ai" ? "rgba(99,102,241,0.2)" : msg.type === "run_output" ? "rgba(40,200,64,0.2)" : msg.type === "system" ? "rgba(255,255,255,0.05)" : msg.uid === user?.uid ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 6, padding: "8px 10px"
            }}>
              {msg.type === "ai" || msg.type === "run_output"
                ? <div className="ai-markdown"><MarkdownMessage text={msg.text} /></div>
                : msg.type === "system"
                ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, fontStyle: "italic" }}>{msg.text.replace(/\*\*/g, "")}</div>
                : <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.text}</div>
              }
            </div>
          </div>
        ))
      )}
      {aiLoading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "rgba(99,102,241,0.7)", marginBottom: 3 }}>AI thinking...</div>
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "8px 10px", display: "flex", gap: 4, alignItems: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, background: "rgba(99,102,241,0.6)", borderRadius: "50%", animation: `spin 1s ease-in-out ${i * 0.15}s infinite` }} />)}
          </div>
        </div>
      )}
      {Object.values(typingUsers).length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: "50%", animation: `spin 1s ease-in-out ${i * 0.2}s infinite` }} />)}
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
      <button className="send-btn" onClick={onSendMessage} disabled={aiLoading}>{aiLoading ? "..." : "Send"}</button>
    </div>
  </div>
));

// ✅ Main Room component
export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [activeFileContent, setActiveFileContent] = useState("");
  const [roomExists, setRoomExists] = useState(true);
  const [roomLoading, setRoomLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [mobileTab, setMobileTab] = useState("editor");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [linkCopied, setLinkCopied] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [saveStatus, setSaveStatus] = useState("saved"); // ✅ save indicator
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [fileVersions, setFileVersions] = useState({});

  const cursorThrottleRef = useRef(null);
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
  const isLocalEditRef = useRef(false);

  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || !currentUser.emailVerified) navigate("/login");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user || !roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const memberRef = ref(db, `rooms/${roomId}/members/${user.uid}`);
    setRoomLoading(true);
    const initialLoadRef = { members: false, files: false };
    const checkInitialLoad = () => { if (initialLoadRef.members && initialLoadRef.files) setRoomLoading(false); };

    onValue(roomRef, (snap) => { if (!snap.exists()) { setRoomExists(false); setRoomLoading(false); } }, { onlyOnce: true });

    get(memberRef).then((snap) => {
      set(memberRef, {
        name: user.displayName || user.email, email: user.email,
        joinedAt: snap.exists() ? snap.val().joinedAt : serverTimestamp(), online: true,
      }).then(() => { onDisconnect(memberRef).remove(); });
    });

    const unsubMembers = onValue(ref(db, `rooms/${roomId}/members`), (snap) => {
      setMembers(snap.val() || {});
      if (!initialLoadRef.members) { initialLoadRef.members = true; checkInitialLoad(); }
    });

    const unsubMsgs = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(arr);
      } else setMessages([]);
    });

    const unsubFiles = onValue(ref(db, `rooms/${roomId}/files`), (snap) => {
      const data = snap.val() || {};
      setFiles(data);
      if (!initialLoadRef.files) { initialLoadRef.files = true; checkInitialLoad(); }
      if (activeFileRef.current && data[activeFileRef.current] && !isLocalEditRef.current) {
        setActiveFileContent(data[activeFileRef.current].content || "");
      }
      if (activeFileRef.current && !data[activeFileRef.current]) { setActiveFile(null); setActiveFileContent(""); }
    });

    const unsubTyping = onValue(ref(db, `rooms/${roomId}/typing`), (snap) => {
      const data = snap.val() || {};
      const others = Object.entries(data).filter(([uid]) => uid !== user.uid).reduce((acc, [uid, val]) => ({ ...acc, [uid]: val }), {});
      setTypingUsers(others);
    });

    const ownCursorRef = ref(db, `rooms/${roomId}/cursors/${user.uid}`);
    onDisconnect(ownCursorRef).remove();
    const unsubCursors = onValue(ref(db, `rooms/${roomId}/cursors`), (snap) => { setRemoteCursors(snap.val() || {}); });

    const unsubVersions = onValue(ref(db, `rooms/${roomId}/versions`), (snap) => {
      setFileVersions(snap.val() || {});
    });

    return () => {
      unsubMembers(); unsubMsgs(); unsubFiles(); unsubTyping(); unsubCursors(); unsubVersions();
      remove(ownCursorRef).catch(() => {});
    };
  }, [user, roomId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const aiMsgs = messages.filter(m => m.type === "ai" || m.type === "user");
    conversationHistoryRef.current = aiMsgs.slice(-20).map(m => ({ role: m.type === "ai" ? "assistant" : "user", content: m.text }));
  }, [messages]);

  useEffect(() => {
    if (showNewFileInput && newFileInputRef.current) newFileInputRef.current.focus();
  }, [showNewFileInput]);

  const sanitizeFileName = useCallback((name) => {
    return name.replace(/[#$[\]/.\s]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 150) || 'untitled';
  }, []);

  const handleRestoreVersion = async (content) => {
    if (!activeFile) return;
    try {
      const fileData = { name: files[activeFile]?.name || activeFile, content, updatedBy: user?.displayName || user?.email };
      await set(ref(db, `rooms/${roomId}/files/${activeFile}`), fileData);
      setActiveFileContent(content);
      setShowVersionHistory(false);
      toast.success("Version restored!");
    } catch (err) { toast.error("Restore failed: " + err.message); }
  };

  const JUDGE0_LANG_IDS = { js: 63, jsx: 63, ts: 74, tsx: 74, py: 71, cpp: 54, c: 50, java: 62, go: 60, rs: 73, php: 68, rb: 72 };

  const handleRunForAll = async (fileKey, content, ext, stdin = "") => {
    if (!fileKey || !user) return;
    const resolvedExt = ext || (files[fileKey]?.name || fileKey).split(".").pop().toLowerCase();
    const langId = JUDGE0_LANG_IDS[resolvedExt];
    if (!langId) { toast.warning("Run not supported for this file type."); return; }

    const fileName = files[fileKey]?.name || fileKey;
    const sender = user.displayName || user.email;
    const langNames = { 63: "JavaScript", 74: "TypeScript", 71: "Python", 54: "C++", 50: "C", 62: "Java", 60: "Go", 73: "Rust", 68: "PHP", 72: "Ruby" };

    await push(ref(db, `rooms/${roomId}/messages`), {
      text: `▶ **${sender}** is running \`${fileName}\`...`,
      sender: "System", uid: "system", type: "system", timestamp: serverTimestamp(),
    });

    try {
      const res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: content || "", language_id: langId, stdin }),
      });
      const data = await res.json();
      const output = data?.stdout || data?.stderr || data?.compile_output || "(no output)";
      const hasError = !!(data?.stderr || data?.compile_output);

      await push(ref(db, `rooms/${roomId}/messages`), {
        text: `${hasError ? "❌" : "✅"} **Output of \`${fileName}\`** (${langNames[langId] || resolvedExt}):\n\`\`\`\n${output.slice(0, 2000)}${output.length > 2000 ? "\n... (truncated)" : ""}\n\`\`\``,
        sender: "System", uid: "system", type: "run_output", timestamp: serverTimestamp(),
      });
    } catch {
      await push(ref(db, `rooms/${roomId}/messages`), {
        text: `❌ **Run failed for \`${fileName}\`**: Could not connect to execution service.`,
        sender: "System", uid: "system", type: "run_output", timestamp: serverTimestamp(),
      });
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await remove(ref(db, `rooms/${roomId}/members/${user.uid}`));
      await remove(ref(db, `rooms/${roomId}/cursors/${user.uid}`));
    } catch (err) { console.error(err); }
    navigate("/dashboard");
  };

  // ✅ Export as ZIP — no external library
  const handleExportZip = async () => {
    try {
      toast.info("Preparing ZIP...");
      const fileList = Object.values(files);
      if (!fileList.length) { toast.error("No files to export"); return; }
      const crc32 = (buf) => {
        let crc = 0xFFFFFFFF;
        const table = new Uint32Array(256).map((_, i) => { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); return c; });
        for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
      };
      const enc = new TextEncoder();
      const localHeaders = [], dataChunks = [];
      let offset = 0;
      for (const f of fileList) {
        const name = enc.encode(f.name || "file.txt");
        const data = enc.encode(f.content || "");
        const crc = crc32(data);
        const now = new Date();
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const lh = new DataView(new ArrayBuffer(30 + name.length));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
        lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
        lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        new Uint8Array(lh.buffer).set(name, 30);
        localHeaders.push({ name, data, crc, dosDate, dosTime, offset });
        dataChunks.push(new Uint8Array(lh.buffer), data);
        offset += lh.buffer.byteLength + data.length;
      }
      const cdChunks = []; let cdSize = 0; const cdOffset = offset;
      for (const f of localHeaders) {
        const cd = new DataView(new ArrayBuffer(46 + f.name.length));
        cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0, true); cd.setUint16(10, 0, true);
        cd.setUint16(12, f.dosTime, true); cd.setUint16(14, f.dosDate, true); cd.setUint32(16, f.crc, true);
        cd.setUint32(20, f.data.length, true); cd.setUint32(24, f.data.length, true); cd.setUint16(28, f.name.length, true);
        cd.setUint16(30, 0, true); cd.setUint16(32, 0, true); cd.setUint16(34, 0, true); cd.setUint32(38, 0, true); cd.setUint32(42, f.offset, true);
        new Uint8Array(cd.buffer).set(f.name, 46);
        cdChunks.push(new Uint8Array(cd.buffer)); cdSize += cd.buffer.byteLength;
      }
      const eocd = new DataView(new ArrayBuffer(22));
      eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(4, 0, true); eocd.setUint16(6, 0, true);
      eocd.setUint16(8, localHeaders.length, true); eocd.setUint16(10, localHeaders.length, true);
      eocd.setUint32(12, cdSize, true); eocd.setUint32(16, cdOffset, true); eocd.setUint16(20, 0, true);
      const blob = new Blob([...dataChunks, ...cdChunks, new Uint8Array(eocd.buffer)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${roomId?.slice(0, 8) || "room"}-flowcollab.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP downloaded!");
    } catch (err) { console.error(err); toast.error("ZIP export failed"); }
  };

  const handleTyping = useCallback(() => {
    if (!user || !roomId) return;
    const typingRef = ref(db, `rooms/${roomId}/typing/${user.uid}`);
    set(typingRef, { name: user.displayName || user.email, timestamp: serverTimestamp() });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => remove(typingRef), 2000);
  }, [user, roomId]);

  const handleCursorActivity = useCallback((payload) => {
    if (!user || !roomId) return;
    if (cursorThrottleRef.current) return;
    cursorThrottleRef.current = setTimeout(() => { cursorThrottleRef.current = null; }, 120);
    set(ref(db, `rooms/${roomId}/cursors/${user.uid}`), {
      name: user.displayName || user.email, color: colorForUid(user.uid),
      file: activeFileRef.current, ...payload, ts: serverTimestamp(),
    }).catch(() => {});
  }, [user, roomId]);

  useEffect(() => {
    if (!user || !roomId) return;
    const ownCursorRef = ref(db, `rooms/${roomId}/cursors/${user.uid}`);
    get(ownCursorRef).then(snap => {
      if (snap.exists()) set(ownCursorRef, { ...snap.val(), file: activeFile, ts: serverTimestamp() }).catch(() => {});
    });
  }, [activeFile, user, roomId]);

  const handleCreateNewFile = async () => {
    const name = newFileName.trim();
    if (!name) return;
    const safeName = sanitizeFileName(name);
    const currentUser = userRef.current;
    try {
      const fileRef = ref(db, `rooms/${roomId}/files/${safeName}`);
      const existing = await get(fileRef);
      if (existing.exists()) { toast.warning("A file with that name already exists."); return; }
      const newFileObj = { name, content: "", updatedBy: currentUser?.displayName || currentUser?.email || "Unknown" };
      setFiles(prev => ({ ...prev, [safeName]: newFileObj }));
      setActiveFile(safeName); setActiveFileContent(""); setNewFileName(""); setShowNewFileInput(false);
      if (isMobile) setMobileTab("editor");
      set(fileRef, newFileObj).catch(err => console.error(err));
    } catch (err) { console.error(err); }
  };

  const handleFileUpload = useCallback((e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (!uploadedFiles.length) return;
    uploadedFiles.forEach((file, index) => {
      const relPath = file.webkitRelativePath || file.name;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target.result;
        const safeName = sanitizeFileName(relPath);
        const currentUser = userRef.current;
        const newFileObj = { name: relPath, content, updatedBy: currentUser?.displayName || currentUser?.email || "Unknown" };
        try {
          setFiles(prev => ({ ...prev, [safeName]: newFileObj }));
          if (index === 0) { setActiveFile(safeName); setActiveFileContent(content); isLocalEditRef.current = true; if (isMobile) setMobileTab("editor"); }
          await set(ref(db, `rooms/${roomId}/files/${safeName}`), newFileObj);
        } catch (err) { console.error("File upload error:", err); toast.error("Failed to upload file — please try again."); }
        finally { if (index === 0) setTimeout(() => { isLocalEditRef.current = false; }, 1000); }
      };
      reader.readAsText(file);
    });
    e.target.value = "";
  }, [roomId, isMobile, sanitizeFileName, toast]);

  const handleDeleteFile = useCallback(async (e, name) => {
    e.stopPropagation();
    try {
      await remove(ref(db, `rooms/${roomId}/files/${name}`));
      if (activeFile === name) { setActiveFile(null); setActiveFileContent(""); }
    } catch (err) { console.error(err); }
  }, [roomId, activeFile]);

  const handleFileClick = useCallback((name) => {
    setActiveFile(name);
    setActiveFileContent(files[name]?.content || "");
    if (isMobile) setMobileTab("editor");
  }, [files, isMobile]);

  // ✅ handleCodeChange with save status
  const handleCodeChange = useCallback((val) => {
    const value = val || "";
    setActiveFileContent(value);
    isLocalEditRef.current = true;
    setSaveStatus("saving");
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (activeFileRef.current) {
        try {
          const fileData = {
            name: filesRef.current[activeFileRef.current]?.name || activeFileRef.current,
            content: value,
            updatedBy: user?.displayName || user?.email
          };
          await set(ref(db, `rooms/${roomId}/files/${activeFileRef.current}`), fileData);

          // ✅ Save version snapshot (keep last 10)
          const versionsRef = ref(db, `rooms/${roomId}/versions/${activeFileRef.current}`);
          const versSnap = await get(versionsRef);
          const existingVersions = versSnap.exists() ? Object.values(versSnap.val()) : [];
          const newVersion = { content: value, savedAt: Date.now(), savedBy: user?.displayName || user?.email || "Unknown" };
          const updatedVersions = [newVersion, ...existingVersions].slice(0, 10);
          const versionsObj = {};
          updatedVersions.forEach((v, i) => { versionsObj[`v${i}`] = v; });
          set(versionsRef, versionsObj).catch(() => {});

          setSaveStatus("saved");
        } catch (err) { console.error(err); setSaveStatus("error"); }
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
      await set(ref(db, `rooms/${roomId}/files/${fileName}`), { name: files[fileName]?.name || fileName, content: newContent, updatedBy: "AI" });
      if (activeFile === fileName) setActiveFileContent(newContent);
      setPendingChange(null);
      toast.success(`Changes applied to ${files[fileName]?.name || fileName}`);
      await push(ref(db, `rooms/${roomId}/messages`), { text: `✅ Changes applied to **${files[fileName]?.name || fileName}** successfully!`, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
    } catch (err) {
      await push(ref(db, `rooms/${roomId}/messages`), { text: "❌ Failed to apply changes: " + err.message, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
    }
  };

  const handleAIMessage = async (userQuery) => {
    setAiLoading(true);
    const keySnap = await get(ref(db, `users/${user.uid}/apiKey`));
    if (!keySnap.exists()) {
      await push(ref(db, `rooms/${roomId}/messages`), { text: "⚠️ No API key found. Please add your API key in the Dashboard first.", sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
      setAiLoading(false); return;
    }
    const { key, provider } = keySnap.val();
    const fileContext = Object.entries(files).map(([safeName, f]) => `File: ${f.name || safeName}\n\`\`\`\n${f.content || ""}\n\`\`\``).join("\n\n");
    const memberNames = Object.values(members).map(m => m.name).join(", ");
    const systemPrompt = `You are an AI coding assistant embedded in FlowCollab — a real-time collaborative coding tool.\n\nTeam members online: ${memberNames}\n\nProject files (FULL CONTENT):\n${fileContext || "No files uploaded yet."}\n\nIMPORTANT RULES:\n1. You ONLY respond when directly mentioned with @ai\n2. You remember the full conversation history\n3. You know ALL project files\n4. If asked to change a file, respond with explanation + COMPLETE updated file in code block + "Should I apply this change? (yes/no)"\n5. Keep responses concise\n6. Always respond in the same language the user used`;
    try {
      let aiResponse = "";
      const history = conversationHistoryRef.current;
      if (provider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 2048, system: systemPrompt, messages: [...history, { role: "user", content: userQuery }] }) });
        const data = await res.json(); aiResponse = data.content?.[0]?.text || "No response from Claude.";
      } else if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` }, body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userQuery }] }) });
        const data = await res.json(); aiResponse = data.choices?.[0]?.message?.content || "No response from GPT-4.";
      } else if (provider === "gemini") {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`)}`;
        const historyText = history.map(h => `${h.role === "user" ? "User" : "AI"}: ${h.content}`).join("\n");
        const res = await fetch(proxyUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\nConversation history:\n" + historyText + "\n\nUser: " + userQuery }] }] }) });
        const data = await res.json(); aiResponse = data.error?.code === 429 ? "❌ Quota exceeded — try again tomorrow." : data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
      } else if (provider === "groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` }, body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 2048, messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userQuery }] }) });
        const data = await res.json(); aiResponse = data.choices?.[0]?.message?.content || "No response from Groq.";
      }
      const codeBlockMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);
      const wantsToApply = aiResponse.toLowerCase().includes("should i apply") || aiResponse.toLowerCase().includes("apply this change");
      if (codeBlockMatch && wantsToApply) {
        const newContent = codeBlockMatch[1];
        let targetFile = activeFile;
        for (const fKey of Object.keys(files)) {
          if (aiResponse.toLowerCase().includes((files[fKey]?.name || fKey).toLowerCase())) { targetFile = fKey; break; }
        }
        if (targetFile) setPendingChange({ fileName: targetFile, newContent });
      }
      await push(ref(db, `rooms/${roomId}/messages`), { text: aiResponse, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
    } catch (err) {
      await push(ref(db, `rooms/${roomId}/messages`), { text: "❌ AI error: " + err.message, sender: "AI", uid: "ai", type: "ai", timestamp: serverTimestamp() });
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

  if (roomLoading) return (
    <div style={{ background: "#000", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif", color: "white" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fc-pulse { 0%,100% { opacity: 0.2; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes fc-room-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fc-loading-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.5); animation: fc-pulse 1.4s ease-in-out infinite; }
      `}</style>
      <div style={{ marginBottom: 28, animation: "fc-room-in 0.4s ease both" }}>
        <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
          <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" fill="none" />
          <polygon points="11,6 16,9 16,13 11,16 6,13 6,9" fill="white" opacity="0.12" />
          <circle cx="11" cy="11" r="2" fill="rgba(255,255,255,0.8)" />
        </svg>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, animation: "fc-room-in 0.4s ease 0.05s both" }}>
        <div className="fc-loading-dot" style={{ animationDelay: "0s" }} />
        <div className="fc-loading-dot" style={{ animationDelay: "0.2s" }} />
        <div className="fc-loading-dot" style={{ animationDelay: "0.4s" }} />
      </div>
      <div style={{ animation: "fc-room-in 0.4s ease 0.1s both", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Connecting to room</p>
        <code style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", padding: "2px 10px", borderRadius: 4 }}>{roomId}</code>
      </div>
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
        .copy-invite-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: rgba(255,255,255,0.4); cursor: pointer; transition: border-color .25s, color .25s, background .25s; white-space: nowrap; }
        .copy-invite-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.75); }
        .copy-invite-btn.copied { border-color: rgba(40,200,64,0.5); color: #28c840; background: rgba(40,200,64,0.07); cursor: default; }
        .ai-markdown { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.6; word-break: break-word; }
        .ai-markdown p:first-child { margin-top: 0; } .ai-markdown p:last-child { margin-bottom: 0; }
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
            <button className={`copy-invite-btn${linkCopied ? " copied" : ""}`}
              onClick={() => {
                if (linkCopied) return;
                const link = `${window.location.origin}/room/${roomId}`;
                navigator.clipboard.writeText(link).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }).catch(() => toast.info("Link: " + link));
              }}>
              {linkCopied ? "Copied ✓" : "Copy invite"}
            </button>
          )}
          {!isMobile && (
            <button className="copy-invite-btn" onClick={handleExportZip} title="Download all files as ZIP">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export ZIP
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
                remoteCursors={remoteCursors} currentUid={user?.uid} onCursorActivity={handleCursorActivity}
                saveStatus={saveStatus}
                onShowHistory={() => setShowVersionHistory(true)}
                onRunForAll={handleRunForAll}
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
              remoteCursors={remoteCursors} currentUid={user?.uid} onCursorActivity={handleCursorActivity}
              saveStatus={saveStatus}
              onShowHistory={() => setShowVersionHistory(true)}
              onRunForAll={handleRunForAll}
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

      {/* ✅ Version History Modal */}
      {showVersionHistory && activeFile && (
        <VersionHistoryModal
          versions={Object.values(fileVersions[activeFile] || {}).sort((a, b) => b.savedAt - a.savedAt)}
          currentContent={activeFileContent}
          fileName={files[activeFile]?.name || activeFile}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}