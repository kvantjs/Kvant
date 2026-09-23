import { z } from "zod";
import { invokeLLM, type ToolCall } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { deleteChat, getChat, getWorkspace, listChats, saveChat, saveWorkspace } from "./db";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });
const workspaceFileSchema = z.object({ path: z.string(), kind: z.string(), content: z.string() });
const rawAgentActionSchema = z.object({
  type: z.string(),
  path: z.string().min(1),
  content: z.string().optional(),
  explanation: z.string().optional(),
});
const agentActionSchema = rawAgentActionSchema.transform((action) => ({
  ...action,
  type: action.type === "create" || action.type === "add" ? "create_file" as const : action.type === "delete" || action.type === "remove" ? "delete_file" as const : "write_file" as const,
}));
type AgentAction = z.infer<typeof agentActionSchema>;

const workspaceChangesTool = {
  type: "function" as const,
  function: {
    name: "apply_workspace_changes",
    description: "Aplica diretamente no workspace as alterações de código solicitadas pelo usuário. Use write_file para arquivos existentes, create_file para arquivos novos e delete_file somente se solicitado.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          description: "Lista completa de alterações a aplicar",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["write_file", "create_file", "delete_file"] },
              path: { type: "string", description: "Caminho relativo do arquivo" },
              content: { type: "string", description: "Conteúdo completo do arquivo; obrigatório para write_file e create_file" },
              explanation: { type: "string", description: "Explicação curta da alteração" },
            },
            required: ["type", "path", "content", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["actions"],
      additionalProperties: false,
    },
  },
};

const defaultFiles = [
  { path: "src/App.tsx", kind: "tsx", content: "export default function App() {\n  return <main>Welcome to your workspace.</main>;\n}\n" },
  { path: "src/main.tsx", kind: "tsx", content: "import { createRoot } from 'react-dom/client';\nimport App from './App';\n\ncreateRoot(document.getElementById('root')!).render(<App />);\n" },
  { path: "package.json", kind: "json", content: "{\n  \"scripts\": { \"dev\": \"vite\" },\n  \"dependencies\": { \"react\": \"latest\" }\n}\n" },
  { path: "README.md", kind: "md", content: "# Kvant workspace\n\nDescribe your next build here.\n" },
];

function extractToolActions(toolCalls: ToolCall[] | undefined): AgentAction[] {
  const call = toolCalls?.find((item) => item.type === "function" && item.function.name === "apply_workspace_changes");
  if (!call) return [];
  try {
    const parsed = JSON.parse(call.function.arguments) as { actions?: unknown };
    const result = z.array(rawAgentActionSchema).safeParse(parsed.actions ?? []);
    if (!result.success) return [];
    return result.data.map((action) => agentActionSchema.parse(action));
  } catch {
    return [];
  }
}

function summarizeActions(actions: AgentAction[]) {
  if (actions.length === 0) return "O agente não conseguiu chamar a ferramenta de alterações. Tente novamente descrevendo a tarefa e os arquivos envolvidos.";
  const creates = actions.filter((action) => action.type === "create_file").length;
  const writes = actions.filter((action) => action.type === "write_file").length;
  const deletes = actions.filter((action) => action.type === "delete_file").length;
  const parts = [writes && `${writes} arquivo${writes === 1 ? "" : "s"} atualizado${writes === 1 ? "" : "s"}`, creates && `${creates} criado${creates === 1 ? "" : "s"}`, deletes && `${deletes} removido${deletes === 1 ? "" : "s"}`].filter(Boolean);
  return `Ação executada no workspace: ${parts.join(", ")}. As alterações já estão disponíveis no editor Monaco.`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  chat: router({
    list: publicProcedure.query(({ ctx }) => listChats(ctx.user?.id ?? null)),
    get: publicProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
      const chat = await getChat(input.id, ctx.user?.id ?? null);
      if (!chat) return { id: input.id, title: "Nova conversa", messages: [] as Array<z.infer<typeof messageSchema>> };
      return { ...chat, messages: JSON.parse(chat.messages) as Array<z.infer<typeof messageSchema>> };
    }),
    send: publicProcedure.input(z.object({
      chatId: z.string().min(1),
      prompt: z.string().min(1).max(12000),
      history: z.array(messageSchema).max(50),
      workspaceFiles: z.array(workspaceFileSchema).max(80),
    })).mutation(async ({ ctx, input }) => {
      const userMessage = { role: "user" as const, content: input.prompt };
      const messages = [...input.history, userMessage];
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é o agente operacional do Kvant. Sempre execute a tarefa chamando obrigatoriamente a ferramenta apply_workspace_changes. Não escreva código na resposta textual. Para cada arquivo alterado, envie o conteúdo COMPLETO. Analise os arquivos atuais antes de decidir as alterações. Preserve arquivos não relacionados.",
          },
          { role: "system", content: `Arquivos atuais do workspace:\n${JSON.stringify(input.workspaceFiles)}` },
          ...messages,
        ],
        tools: [workspaceChangesTool],
        tool_choice: "required",
        model: "gpt-5",
      });
      const actions = extractToolActions(response.choices?.[0]?.message?.tool_calls);
      const assistantMessage = { role: "assistant" as const, content: summarizeActions(actions) };
      const allMessages = [...messages, assistantMessage];
      const title = input.history.length === 0 ? input.prompt.slice(0, 58) : "Conversa de desenvolvimento";
      await saveChat({ id: input.chatId, userId: ctx.user?.id ?? null, title, messages: JSON.stringify(allMessages) });
      return { chatId: input.chatId, title, userMessage, assistantMessage, messages: allMessages, actions };
    }),
    rename: publicProcedure.input(z.object({ id: z.string(), title: z.string().min(1).max(180) })).mutation(async ({ ctx, input }) => {
      const chat = await getChat(input.id, ctx.user?.id ?? null);
      if (!chat || !ctx.user) return { success: false };
      await saveChat({ id: chat.id, userId: ctx.user.id, title: input.title.trim(), messages: chat.messages });
      return { success: true };
    }),
    remove: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user) await deleteChat(input.id, ctx.user.id);
      return { success: true };
    }),
  }),
  workspace: router({
    current: publicProcedure.query(async ({ ctx }) => {
      const workspace = await getWorkspace(ctx.user?.id ?? null);
      if (!workspace) return { id: "local-workspace", name: "Kvant starter", repository: "kvantjs/Kvant", framework: "React + Vite", files: defaultFiles };
      return { ...workspace, files: JSON.parse(workspace.files) as typeof defaultFiles };
    }),
    save: publicProcedure.input(z.object({
      id: z.string(), name: z.string().min(1), repository: z.string().optional(), framework: z.string(), files: z.array(workspaceFileSchema),
    })).mutation(async ({ ctx, input }) => {
      await saveWorkspace({ ...input, userId: ctx.user?.id ?? null, files: JSON.stringify(input.files) });
      return { success: true, savedAt: new Date().toISOString() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
