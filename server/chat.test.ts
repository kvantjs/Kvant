import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("chat.send", () => {
  beforeEach(() => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { role: "assistant", content: "", tool_calls: [{ id: "call-1", type: "function", function: { name: "apply_workspace_changes", arguments: JSON.stringify({ actions: [{ type: "create", path: "src/App.tsx", content: "export default function App() { return <main>Pronto</main>; }", explanation: "Atualiza a tela inicial" }] }) } }] } }],
    } as never);
  });

  it("combines the prompt with history and returns an assistant message", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.chat.send({
      chatId: "chat-test",
      prompt: "Como inicio este projeto?",
      history: [{ role: "user", content: "Tenho um workspace React" }],
      workspaceFiles: [{ path: "src/App.tsx", kind: "tsx", content: "export default function App() {}" }],
    });

    expect(result.chatId).toBe("chat-test");
    expect(result.messages).toHaveLength(3);
    expect(result.assistantMessage.role).toBe("assistant");
    expect(result.assistantMessage.content).toContain("1 criado");
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]?.path).toBe("src/App.tsx");
    expect(result.actions[0]?.type).toBe("create_file");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalledOnce();
    expect(vi.mocked(invokeLLM).mock.calls[0]?.[0]).toMatchObject({
      tool_choice: "required",
      tools: [{ function: { name: "apply_workspace_changes" } }],
    });
  });
});
