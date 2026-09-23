# Migração do Kvant para Kvant

## Resultado

O projeto `kvant-kvant` adapta o núcleo do aplicativo Kvant para o runtime fullstack do Kvant, mantendo a experiência de workspace em três áreas: navegação/histórico, chat de desenvolvimento e workbench de arquivos.

## Componentes portados

| Área do Kvant | Implementação no Kvant |
|---|---|
| Chat com assistente | Agente operacional via `chat.send`: responde com ações estruturadas e resumo, sem despejar código no chat |
| Histórico de conversas | Tabela `chats`, procedimentos `chat.list`, `chat.get`, `chat.rename` e `chat.remove` |
| Workspace de arquivos | Tabela `workspaces`, editor de arquivos e salvamento via `workspace.save` |
| Workbench | Abas Código, Preview e Terminal, árvore de arquivos, editor Monaco e status de ações aplicadas |
| Login | Kvant OAuth já fornecido pelo scaffold fullstack |
| Tema e responsividade | UI escura inspirada no Kvant, adaptada para desktop e mobile |
| Testes | Teste de autenticação existente e teste do fluxo `chat.send` |

## Integrações Kvant usadas

As chaves e chamadas de modelo permanecem no servidor por meio de `server/_core/llm.ts`; nenhum segredo do provedor é exposto ao navegador. Chats e workspaces autenticados são persistidos no banco Kvant. O login utiliza a infraestrutura OAuth do scaffold, e o preview é servido pelo ambiente gerenciado do WebDev.

O agente recebe a lista atual de arquivos, produz ações `write_file`, `create_file` ou `delete_file` em JSON estruturado e o frontend aplica cada ação imediatamente no estado do workspace e no editor Monaco. O salvamento do workspace é acionado automaticamente após alterações do agente.

## Limites desta primeira migração

O repositório original também contém conectores opcionais para GitLab, Supabase, Netlify, Vercel, MCP, modelos locais e Electron/WebContainer. Esses módulos dependem de credenciais específicas, APIs externas ou capacidades de desktop que não devem ser simuladas no runtime web. A interface preserva os pontos de extensão no workbench; a implementação pode ser adicionada por integração individual sem alterar o modelo de autenticação e persistência já criado.

## Validação

- `pnpm test -- --run`: 2 arquivos e 2 testes aprovados.
- `pnpm check`: aprovado.
- `pnpm build`: aprovado.
- Preview revisado em desktop `1280x720` e mobile `375x812`.
- Migração SQL aplicada para as tabelas `chats` e `workspaces`.
