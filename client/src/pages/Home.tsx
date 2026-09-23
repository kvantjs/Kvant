import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Editor from "@monaco-editor/react";
import { Streamdown } from "streamdown";
import { RuntimePreview } from "@/components/RuntimePreview";
import { useEffect, useMemo, useState } from "react";
import {
  Braces, ChevronDown, ChevronRight, CircleUserRound, Code2, Copy, Database, Eye, ExternalLink, FileCode2,
  Folder, FolderOpen, Github, GitBranch, History, LayoutPanelTop, Loader2, Menu,
  MessageSquare, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Play, Plus,
  RefreshCw, Rocket, Send, Settings2, Share2, Sparkles, TerminalSquare, Trash2,
  UploadCloud, WandSparkles, X, Zap,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type WorkspaceFile = { path: string; kind: string; content: string };
type AgentAction = { type: "write_file" | "create_file" | "delete_file"; path: string; content?: string; explanation?: string };

function languageForFile(path?: string) {
  if (!path) return "typescript";
  if (path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".html")) return "html";
  return "plaintext";
}

function applyAgentActions(current: WorkspaceFile[], actions: AgentAction[]) {
  let next = [...current];
  for (const action of actions) {
    const index = next.findIndex((file) => file.path === action.path);
    if (action.type === "delete_file") {
      if (index >= 0) next.splice(index, 1);
      continue;
    }
    const file = { path: action.path, kind: action.path.split(".").pop() ?? "txt", content: action.content ?? "" };
    if (index >= 0) next[index] = { ...next[index], ...file };
    else next.push(file);
  }
  return next;
}

type NavItemProps = { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void };
function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return <button onClick={onClick} className={`nav-item ${active ? "nav-item-active" : ""}`}><span>{icon}</span><span>{label}</span></button>;
}

function KvantMark({ small = false }: { small?: boolean }) {
  return <div className={`kvant-mark ${small ? "kvant-mark-small" : ""}`}><span className="kvant-mark-dot" /><span className="kvant-mark-line" /><span className="kvant-mark-dot" /></div>;
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return <div className="message-row message-row-user"><div className="user-bubble">{message.content}</div></div>;
  }
  return <div className="message-row"><div className="assistant-avatar"><Sparkles size={14} /></div><div className="assistant-copy"><Streamdown>{message.content}</Streamdown><div className="message-actions"><button><Copy size={12} /> Copiar</button><button><RefreshCw size={12} /> Regerar</button></div></div></div>;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const [activeChatId, setActiveChatId] = useState(() => crypto.randomUUID().replaceAll("-", "").slice(0, 24));
  const [input, setInput] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "terminal">(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    return requestedTab === "code" || requestedTab === "terminal" ? requestedTab : "preview";
  });
  const [selectedPath, setSelectedPath] = useState("src/App.tsx");
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [savedToast, setSavedToast] = useState(false);
  const [lastAppliedActions, setLastAppliedActions] = useState(0);

  const chatsQuery = trpc.chat.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const chatQuery = trpc.chat.get.useQuery({ id: activeChatId }, { refetchOnWindowFocus: false });
  const workspaceQuery = trpc.workspace.current.useQuery(undefined, { refetchOnWindowFocus: false });
  const saveWorkspaceMutation = trpc.workspace.save.useMutation({
    onSuccess: () => { setSavedToast(true); window.setTimeout(() => setSavedToast(false), 2200); },
  });
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (result) => {
      utils.chat.get.setData({ id: activeChatId }, { id: activeChatId, title: result.title, messages: result.messages });
      utils.chat.list.invalidate();
      const nextFiles = applyAgentActions(files, result.actions);
      if (result.actions.length > 0) {
        setFiles(nextFiles);
        setLastAppliedActions(result.actions.length);
        if (!nextFiles.some((file) => file.path === selectedPath)) setSelectedPath(nextFiles[0]?.path ?? "");
        saveWorkspaceMutation.mutate({ id: workspaceQuery.data?.id ?? "local-workspace", name: workspaceQuery.data?.name ?? "Kvant starter", repository: workspaceQuery.data?.repository ?? "kvantjs/Kvant", framework: workspaceQuery.data?.framework ?? "React + Vite", files: nextFiles });
      } else {
        setLastAppliedActions(0);
      }
      setInput("");
    },
  });

  useEffect(() => {
    if (workspaceQuery.data?.files) setFiles(workspaceQuery.data.files);
  }, [workspaceQuery.data]);

  useEffect(() => {
    const ignoreResizeObserverLoop = (event: ErrorEvent) => {
      if (event.message?.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", ignoreResizeObserverLoop, true);
    return () => window.removeEventListener("error", ignoreResizeObserverLoop, true);
  }, []);

  const activeFile = useMemo(() => files.find((file) => file.path === selectedPath) ?? files[0], [files, selectedPath]);
  const messages = (chatQuery.data?.messages ?? []) as Message[];

  const newChat = () => {
    setActiveChatId(crypto.randomUUID().replaceAll("-", "").slice(0, 24));
    setInput("");
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setMobileNav(false);
  };

  const sendPrompt = async () => {
    const prompt = input.trim();
    if (!prompt || sendMutation.isPending) return;
    await sendMutation.mutateAsync({
      chatId: activeChatId,
      prompt,
      history: messages,
      workspaceFiles: files,
    });
  };

  const updateActiveFile = (content: string) => {
    if (!activeFile) return;
    setFiles((current) => current.map((file) => file.path === activeFile.path ? { ...file, content } : file));
  };

  const saveWorkspace = () => {
    saveWorkspaceMutation.mutate({ id: workspaceQuery.data?.id ?? "local-workspace", name: workspaceQuery.data?.name ?? "Kvant starter", repository: workspaceQuery.data?.repository ?? "kvantjs/Kvant", framework: workspaceQuery.data?.framework ?? "React + Vite", files });
  };

  const chatTitle = chatQuery.data?.title ?? "Nova conversa";

  return <div className="kvant-shell">
    <aside className={`kvant-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-topline"><div className="brand"><KvantMark small={!sidebarCollapsed} /><span className="brand-name">kvant<span className="brand-dot">.</span></span></div><IconButton label="Fechar menu" onClick={() => setMobileNav(false)}><X size={16} /></IconButton></div>
      <button className="new-project-button" onClick={newChat}><Plus size={16} /><span>Novo projeto</span><kbd>⌘ K</kbd></button>
      <div className="sidebar-section"><span className="sidebar-label">Workspace</span><NavItem icon={<MessageSquare size={16} />} label="Conversas" active /><NavItem icon={<Folder size={16} />} label="Arquivos" onClick={() => setActiveTab("code")} /><NavItem icon={<TerminalSquare size={16} />} label="Terminal" onClick={() => setActiveTab("terminal")} /><NavItem icon={<Rocket size={16} />} label="Deployments" /></div>
      <div className="sidebar-section history-section"><div className="sidebar-label-row"><span className="sidebar-label">Recentes</span><button onClick={newChat}><Plus size={14} /></button></div>
        {chatsQuery.data?.length ? chatsQuery.data.slice(0, 8).map((chat) => <button className={`history-item ${chat.id === activeChatId ? "history-item-active" : ""}`} key={chat.id} onClick={() => selectChat(chat.id)}><MessageSquare size={14} /><span>{chat.title || "Conversa sem título"}</span></button>) : <div className="history-empty">Suas conversas aparecem aqui</div>}
      </div>
      <div className="sidebar-bottom"><NavItem icon={<Settings2 size={16} />} label="Configurações" /><button className="profile-row" onClick={() => isAuthenticated ? logout() : startLogin()}><span className="profile-avatar">{user?.name?.slice(0, 1).toUpperCase() ?? <CircleUserRound size={16} />}</span><span className="profile-copy"><strong>{authLoading ? "Carregando..." : user?.name ?? "Entrar no workspace"}</strong><small>{isAuthenticated ? "Sessão conectada" : "Login para salvar"}</small></span><MoreHorizontal size={16} /></button></div>
    </aside>

    <main className="kvant-main">
      <header className="topbar"><div className="topbar-left"><IconButton label="Abrir menu" onClick={() => setMobileNav(true)}><Menu size={18} /></IconButton><IconButton label={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"} onClick={() => setSidebarCollapsed((value) => !value)}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</IconButton><div className="breadcrumbs"><span className="breadcrumb-muted">Workspace</span><ChevronRight size={14} /><span>{workspaceQuery.data?.name ?? "Kvant starter"}</span></div></div><div className="builder-toolbar"><button className="builder-mode-active" onClick={() => setActiveTab("preview")}><Eye size={14} /> Preview</button><button onClick={() => setActiveTab("code")}><Code2 size={14} /> Código</button><button onClick={() => setActiveTab("terminal")}><Database size={14} /> Dados</button><span className="builder-address">local://workspace</span><IconButton label="Atualizar preview"><RefreshCw size={14} /></IconButton><IconButton label="Abrir preview em nova aba"><ExternalLink size={14} /></IconButton></div><div className="topbar-right"><button className="share-button"><Share2 size={13} /> Compartilhar</button><button className="publish-button"><UploadCloud size={13} /> Publicar</button><span className="connection-pill"><span className="status-dot" /> Local runtime</span><IconButton label="Mais ações"><MoreHorizontal size={18} /></IconButton></div></header>
      <div className="workspace-grid">
        <section className="chat-pane">
          <div className="pane-header"><div><span className="eyebrow">Assistente de código</span><h1>{chatTitle}</h1></div><div className="pane-actions"><IconButton label="Histórico"><History size={16} /></IconButton><IconButton label="Nova conversa" onClick={newChat}><Plus size={16} /></IconButton></div></div>
          <div className="messages-scroll">{messages.length === 0 ? <div className="welcome-state"><div className="welcome-icon"><KvantMark /></div><span className="eyebrow">Kvant copilot</span><h2>O que vamos construir?</h2><p>Descreva uma ideia, cole um bug ou peça uma revisão. O contexto do seu workspace vai junto com a conversa.</p><div className="agent-plan"><div className="agent-plan-title"><Sparkles size={13} /> Plano de execução</div><div className="agent-task agent-task-done"><span className="task-check">✓</span><span>Entender o objetivo do workspace</span></div><div className="agent-task agent-task-active"><span className="task-spinner" /><span>Preparar o ambiente de desenvolvimento</span></div><div className="agent-task"><span className="task-circle" /><span>Construir e testar a solução</span></div></div><div className="prompt-grid"><button onClick={() => setInput("Crie uma landing page moderna para este projeto")}> <WandSparkles size={15} /> Criar uma landing page</button><button onClick={() => setInput("Analise a estrutura atual e sugira melhorias")}> <Code2 size={15} /> Revisar arquitetura</button><button onClick={() => setInput("Encontre possíveis bugs no arquivo aberto")}> <Zap size={15} /> Encontrar bugs</button><button onClick={() => setInput("Explique como este arquivo funciona")}> <MessageSquare size={15} /> Explicar código</button></div></div> : messages.map((message, index) => <MessageBubble message={message} key={`${message.role}-${index}`} />)}{sendMutation.isPending && <div className="message-row"><div className="assistant-avatar"><Sparkles size={14} /></div><div className="typing"><span /><span /><span /><em>Raciocinando sobre o workspace...</em></div></div>}{sendMutation.error && <div className="error-note">Não foi possível responder agora. Tente novamente.</div>}</div>
          <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendPrompt(); } }} placeholder="Pergunte qualquer coisa sobre seu código..." rows={2} /><div className="composer-footer"><div className="composer-tools"><button><PaperclipIcon /> Anexar</button><button><Braces size={14} /> Contexto <ChevronDown size={12} /></button></div><button className="send-button" disabled={!input.trim() || sendMutation.isPending} onClick={() => void sendPrompt()}>{sendMutation.isPending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}</button></div></div><span className="composer-hint">Enter para enviar · Shift + Enter para nova linha</span></div>
        </section>

        <section className="workbench-pane">
          <div className="workbench-header"><div className="workbench-tabs"><button className={activeTab === "code" ? "workbench-tab-active" : ""} onClick={() => setActiveTab("code")}><Code2 size={15} /> Código</button><button className={activeTab === "preview" ? "workbench-tab-active" : ""} onClick={() => setActiveTab("preview")}><LayoutPanelTop size={15} /> Preview</button><button className={activeTab === "terminal" ? "workbench-tab-active" : ""} onClick={() => setActiveTab("terminal")}><TerminalSquare size={15} /> Terminal</button></div><div className="workbench-actions"><span className="branch-pill"><GitBranch size={13} /> main <ChevronDown size={12} /></span><button className="run-button"><Play size={13} fill="currentColor" /> Executar</button><IconButton label="Salvar workspace" onClick={saveWorkspace}><span className={savedToast ? "saved-check" : ""}>{savedToast ? "✓" : <MoreHorizontal size={17} />}</span></IconButton></div></div>
          {activeTab === "code" && <div className="code-workspace"><div className="file-tree"><div className="tree-header"><span>Arquivos</span><button><Plus size={14} /></button></div><div className="tree-project"><FolderOpen size={14} /><span>{workspaceQuery.data?.name ?? "kvant-starter"}</span></div>{files.map((file) => <button key={file.path} className={`file-row ${file.path === activeFile?.path ? "file-row-active" : ""}`} onClick={() => setSelectedPath(file.path)}><FileIcon kind={file.kind} /><span>{file.path}</span></button>)}</div><div className="editor-area"><div className="editor-tab"><FileIcon kind={activeFile?.kind ?? "tsx"} /><span>{activeFile?.path ?? "App.tsx"}</span>{lastAppliedActions > 0 && <span className="agent-applied"><Sparkles size={11} /> {lastAppliedActions} aplicado{lastAppliedActions === 1 ? "" : "s"}</span>}<X size={13} /></div><div className="monaco-editor-shell"><Editor height="100%" theme="vs-dark" language={languageForFile(activeFile?.path)} value={activeFile?.content ?? ""} onChange={(value) => updateActiveFile(value ?? "")} options={{ minimap: { enabled: true }, fontSize: 12, fontFamily: "JetBrains Mono, monospace", padding: { top: 16 }, automaticLayout: false, wordWrap: "on", scrollBeyondLastLine: false, tabSize: 2 }} /></div><div className="editor-status"><span>Monaco</span><span>{activeFile?.kind?.toUpperCase() ?? "TSX"}</span><span>UTF-8</span><span className="editor-ready"><span className="status-dot" /> Agente pronto</span></div></div></div>}
          {activeTab === "preview" && <RuntimePreview files={files} mode="preview" />}
          {activeTab === "terminal" && <RuntimePreview files={files} mode="terminal" />}
        </section>
      </div>
    </main>
  </div>;
}

function FileIcon({ kind }: { kind: string }) {
  const color = kind === "tsx" ? "#d8dadd" : kind === "json" ? "#bfc3c8" : kind === "md" ? "#8c929a" : "#a6abb2";
  return <FileCode2 size={14} style={{ color }} />;
}
function PaperclipIcon() { return <span className="paperclip">⌕</span>; }
