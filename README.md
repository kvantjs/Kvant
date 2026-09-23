# Kvant

Kvant é um workspace de desenvolvimento assistido por agente, migrado para uma base **React + Vite + TypeScript** com servidor Express/tRPC, persistência Drizzle/MySQL, autenticação Kvant OAuth, editor Monaco e runtime de preview Sandpack.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS 4 e componentes Radix UI
- Express 4 + tRPC 11
- Drizzle ORM + MySQL/TiDB
- Monaco Editor
- Sandpack para preview executável
- Kvant OAuth e APIs integradas

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Validação

```bash
pnpm check
pnpm test -- --run
pnpm build
```

A aplicação usa as variáveis de ambiente fornecidas pelo runtime Kvant. Não versionamos arquivos `.env`, credenciais, tokens, dependências instaladas ou artefatos de build.

## Estrutura

- `client/`: aplicação React + Vite
- `server/`: API Express/tRPC e integrações
- `drizzle/`: schema e migrações de banco
- `shared/`: tipos e constantes compartilhados
- `MIGRATION.md`: histórico e escopo da migração

## Licença

MIT.
