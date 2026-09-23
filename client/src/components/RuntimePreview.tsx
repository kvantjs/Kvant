import {
  SandpackConsole,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useMemo } from "react";
import { Play, RefreshCw, TerminalSquare } from "lucide-react";

type WorkspaceFile = { path: string; kind: string; content: string };
type RuntimePreviewProps = { files: WorkspaceFile[]; mode: "preview" | "terminal" };

type SandpackFile = { code: string; active?: boolean };

function toSandpackFiles(files: WorkspaceFile[]) {
  const entries: Record<string, SandpackFile> = {};
  for (const file of files) {
    const path = file.path.startsWith("/") ? file.path : `/${file.path}`;
    entries[path] = { code: file.content };
  }
  if (!entries["/src/App.tsx"] && !entries["/src/App.jsx"]) {
    entries["/src/App.tsx"] = { code: "export default function App() { return <main>Crie algo no chat do agente.</main>; }" };
  }
  entries["/src/App.tsx"] = entries["/src/App.tsx"] ?? entries["/src/App.jsx"];
  entries["/src/App.tsx"].active = true;
  return entries;
}

function RuntimeSurface({ files, mode }: RuntimePreviewProps) {
  const { sandpack } = useSandpack();
  const runtimeFiles = useMemo(() => toSandpackFiles(files), [files]);

  useEffect(() => {
    for (const [path, file] of Object.entries(runtimeFiles)) {
      if (sandpack.files[path]?.code !== file.code) {
        sandpack.updateFile(path, file.code, true);
      }
    }
  }, [runtimeFiles]);

  if (mode === "preview") {
    return (
      <div className="runtime-preview-shell">
        <div className="runtime-toolbar">
          <span className="preview-url"><span className="status-dot" /> sandbox://workspace</span>
          <span className="runtime-status"><span className="status-dot" /> {sandpack.status === "running" ? "Executando" : sandpack.status === "idle" ? "Pronto" : sandpack.status}</span>
          <button className="runtime-icon-button" title="Reiniciar runtime" onClick={() => void sandpack.runSandpack()}><RefreshCw size={14} /></button>
        </div>
        <div className="runtime-preview-frame"><SandpackPreview showNavigator={false} showOpenInCodeSandbox={false} showRefreshButton={false} showRestartButton={false} showSandpackErrorOverlay style={{ height: "100%", width: "100%" }} /></div>
      </div>
    );
  }

  return (
    <div className="runtime-terminal-shell">
      <div className="runtime-terminal-header"><TerminalSquare size={14} /> Console real do runtime <span className="runtime-status"><span className="status-dot" /> {sandpack.status}</span><button className="runtime-run-button" onClick={() => void sandpack.runSandpack()}><Play size={12} fill="currentColor" /> Executar</button></div>
      <div className="runtime-console"><SandpackConsole showSyntaxError /></div>
    </div>
  );
}

export function RuntimePreview({ files, mode }: RuntimePreviewProps) {
  const initialFiles = useMemo(() => toSandpackFiles(files), [files]);
  return (
    <SandpackProvider className="runtime-provider-shell" template="react-ts" files={initialFiles} theme="dark" options={{ autorun: true, recompileMode: "immediate", activeFile: "/src/App.tsx", visibleFiles: Object.keys(initialFiles) }}>
      <RuntimeSurface files={files} mode={mode} />
    </SandpackProvider>
  );
}
