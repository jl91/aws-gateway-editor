# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Editor desktop especializado em contratos OpenAPI v3.x para API Gateways, desenvolvido com Electron + Angular. A aplicação permite abrir repositórios (local ou GitHub), criar/editar metadados do gateway e gerenciar endpoints (CRUD). Toda alteração em endpoints atualiza o contrato OpenAPI e registra um HTTP dump (curl) na seção ENDPOINTS do README.md.

## Technology Stack

- **Frontend**: Angular 20+ com Angular Material
- **Desktop Framework**: Electron (última versão estável)
- **Linguagem**: TypeScript
- **Editor de Código**: Monaco Editor
- **Controle de Versão**: Git/GitHub (via Octokit)

## Bibliotecas Essenciais

- `@apidevtools/swagger-parser` - Validação e parsing de OpenAPI
- `js-yaml` - Conversão JSON/YAML
- `monaco-editor` - Editor de código com sintaxe highlighting
- `@octokit/rest` - Integração com GitHub API
- `@stoplight/spectral` - Linting de OpenAPI
- `@angular/material` - Componentes UI

## Estrutura do Projeto

```
/src
  /app                 # Código Angular
    /components        # Componentes reutilizáveis
    /services          # Serviços Angular
    /models            # Interfaces e tipos TypeScript
    /pages             # Páginas/rotas principais
  /electron            # Código do processo principal Electron
    /ipc               # Handlers IPC
    /services          # Serviços do processo principal
/tests                 # Testes unitários e E2E
/assets                # Recursos estáticos
/config                # Configurações
```

## Funcionalidades Principais

### 1. Seleção de Repositório
- Abrir pasta local (filesystem via Electron)
- Conectar repositório GitHub (OAuth/token)
- Criar novo gateway

### 2. Gerenciamento de Endpoints
- Tabela Material com colunas: id | http method | path | actions
- Busca global com filtros
- Paginação e ordenação
- Seleção múltipla

### 3. Editor de Endpoints (Modal)
- **Basic**: operationId, summary, description, tags, method, path, security
- **Parameters**: Path, Query, Header, Cookie params
- **Request Body**: Content types, schema editor, examples
- **Responses**: Códigos HTTP, schemas, examples
- **Integrations**: Lambda, HTTP proxy, Mock, StepFunction
- **Policies/Settings**: Throttling, caching, mapping templates
- **Advanced**: x-extensions, deploy tags/stages
- **Preview/Test**: Geração de curl e teste opcional

### 4. Persistência
- Validação com swagger-parser antes de salvar
- Atualização automática do README.md com exemplos curl
- Commit direto ou criação de PR (configurável)
- Mensagens de commit padronizadas

## Padrões e Convenções

### Comunicação Electron-Angular
- Usar IPC (Inter-Process Communication) para operações de filesystem
- Implementar handlers seguros no processo principal
- Validar todas as operações antes de executar

### Estado da Aplicação
- RxJS com BehaviorSubjects para estado local
- Services singleton para compartilhar estado entre componentes
- Considerar NgRx apenas se complexidade justificar

### Validações
- Validar unicidade de paths por método HTTP
- Detectar conflitos entre parâmetros
- Resolver $ref e validar schemas JSON
- Executar lint (spectral) antes de commits

### UI/UX
- Badges coloridos para métodos HTTP (estilo Insomnia)
- Monaco Editor para visualização/edição de JSON/YAML
- Feedback visual para operações assíncronas
- Mensagens de erro claras e acionáveis

## Segurança

- NUNCA armazenar credenciais no código
- Usar secure storage do Electron para tokens
- Validar e sanitizar todos os inputs
- Implementar CSP (Content Security Policy)
- Desabilitar nodeIntegration no renderer
- Usar contextBridge para expor APIs seguras

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev          # Inicia Angular + Electron em modo watch
npm run build        # Build de produção
npm run test         # Testes unitários
npm run e2e          # Testes E2E com Playwright
npm run lint         # Linting do código
npm run typecheck    # Verificação de tipos TypeScript
```

## Critérios de Qualidade

- Cobertura de testes > 80%
- Sem erros de lint
- Tipos TypeScript estritos (strict mode)
- Documentação JSDoc para funções públicas
- Commits seguindo Conventional Commits

## Fluxo Git

- Branch principal: `main`
- Desenvolvimento: `develop`
- Features: `feat/nome-da-feature`
- Correções: `fix/nome-do-bug`
- PRs obrigatórios com revisão antes de merge

## Mensagens de Commit

Formato: `tipo(escopo): descrição`

Exemplos:
- `feat(gateway): add endpoint POST /users`
- `fix(editor): validate schema for GET /items`
- `chore(readme): update ENDPOINTS section`
- `refactor(table): improve search performance`
- `test(endpoints): add unit tests for CRUD operations`

## Criacao de arquivos MD
Nao se deve criar nenhum arquivo MD alem do CLAUDE.md, WIP.md e README.md. Sempre que precisar criar um arquivo temporario utilize o README.md como banco de dados temporario. Toda tarefa que precisar ser criada deve ser registrada no arquivo WIP.md. Sempre que precisar trabalhar, leia o arquivo WIP.md. o Arquivo README.md nao deve ser alterado.