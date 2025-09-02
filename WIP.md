# WIP - Work In Progress

## 🔄 MIGRAÇÃO: Remoção do Electron e Criação do Backend Node.js

### Status da Migração
**Iniciado em:** 02/09/2025  
**Objetivo:** Remover dependência do Electron e tornar o frontend "burro", movendo toda lógica de negócio para um backend Node.js/NestJS

---

## 📋 TAREFAS DE MIGRAÇÃO

### FASE 1: Infraestrutura Docker [CONCLUÍDO]
- [x] Criar pasta `infra-local/`
- [x] Configurar `docker-compose.yml` com PostgreSQL 15+
- [x] Criar script `init.sql` com estrutura do banco
- [x] Configurar volumes para persistência
- [x] Criar `.env.example` com variáveis
- [x] Adicionar scripts de backup/restore
- [ ] Testar conexão e persistência

### FASE 2: Backend NestJS - Setup Inicial [CONCLUÍDO]
- [x] Criar pasta `backend/`
- [x] Inicializar projeto NestJS (`nest new backend`)
- [x] Configurar TypeORM com PostgreSQL
- [x] Criar módulo Database com migrations
- [x] Configurar Swagger para documentação
- [x] Adicionar CORS e segurança básica
- [x] Configurar variáveis de ambiente
- [x] Implementar health check endpoint

### FASE 3: Modelo de Dados e Entities [CONCLUÍDO]
- [x] Criar entity `GatewayConfig`
- [x] Criar entity `GatewayEndpoint` com `sequence_order`
- [x] Criar entity `ImportHistory`
- [x] Criar entity `ExportCache`
- [ ] Gerar migrations iniciais
- [x] Adicionar índices necessários (no init.sql)
- [x] Implementar soft delete
- [ ] Criar seeds para desenvolvimento

### FASE 4: Módulo de Importação [CONCLUÍDO]
- [x] Configurar Multer para upload de ZIP
- [x] Implementar descompactação com `adm-zip`
- [x] Parser para OpenAPI (mover lógica do frontend)
- [x] Validação com `@apidevtools/swagger-parser`
- [x] Cálculo de hash para evitar duplicatas
- [x] Persistência preservando ordem
- [x] Tratamento de erros detalhado
- [x] Endpoint POST `/api/gateway/import`

### FASE 5: Módulo de Gateway Management [CONCLUÍDO]
- [x] GET `/api/gateway/configs` - Listar configurações
- [x] GET `/api/gateway/configs/:id` - Detalhes
- [x] PUT `/api/gateway/configs/:id` - Atualizar
- [x] DELETE `/api/gateway/configs/:id` - Remover
- [x] POST `/api/gateway/configs/:id/activate` - Ativar
- [ ] Implementar versionamento
- [x] Adicionar paginação e filtros
- [ ] Cache com Redis (opcional)

### FASE 6: Módulo de Endpoints Management [CONCLUÍDO]
- [x] GET `/api/gateway/:configId/endpoints` - Listar com ordem
- [x] POST `/api/gateway/:configId/endpoints` - Adicionar
- [x] PUT `/api/gateway/:configId/endpoints/:id` - Atualizar
- [x] DELETE `/api/gateway/:configId/endpoints/:id` - Remover
- [x] PUT `/api/gateway/:configId/endpoints/reorder` - Reordenar
- [x] Validação de unicidade path+method
- [ ] Resolução de $ref
- [ ] Geração de operationId automático

### FASE 7: Módulo de Exportação [CONCLUÍDO]
- [x] GET `/api/gateway/export/:configId` - Download
- [x] GET `/api/gateway/export/:configId/status` - Status cache
- [x] Reconstrução do OpenAPI do banco
- [x] Preservação da ordem original
- [x] Sistema de cache com hash
- [ ] Compactação opcional
- [x] Formato JSON/YAML configurável
- [ ] Atualização do README.md com curl examples

### FASE 8: Migração da Lógica do Frontend
- [ ] Identificar toda lógica de negócio no frontend atual
- [ ] Mover OpenApiService para backend
- [ ] Mover ValidationService para backend
- [ ] Mover lógica de parsing para backend
- [ ] Mover geração de curl para backend
- [ ] Mover lógica de Git/GitHub para backend
- [ ] Remover dependências do Electron do frontend
- [ ] Criar DTOs para todas as operações

### FASE 9: Adaptação do Frontend Angular
- [ ] Remover electron.service.ts
- [ ] Remover IPC handlers
- [ ] Criar ApiService para consumir REST
- [ ] Adaptar componentes para usar ApiService
- [ ] Remover lógica de filesystem
- [ ] Implementar upload via HTTP
- [ ] Adaptar estado para ser stateless
- [ ] Configurar proxy para desenvolvimento

### FASE 10: Remoção do Electron
- [ ] Remover arquivos main.ts (Electron)
- [ ] Remover preload.ts
- [ ] Remover electron-builder config
- [ ] Limpar package.json de deps Electron
- [ ] Atualizar scripts npm
- [ ] Converter para SPA puro
- [ ] Configurar nginx para produção
- [ ] Testar build de produção

### FASE 11: Testes e Validação
- [ ] Testes unitários backend (Jest)
- [ ] Testes de integração das APIs
- [ ] Testes E2E com Playwright
- [ ] Validar importação/exportação
- [ ] Testar preservação de ordem
- [ ] Validar cache e performance
- [ ] Teste de carga com grandes arquivos
- [ ] Validar Docker Compose completo

### FASE 12: Documentação e Deploy
- [ ] Atualizar README.md principal
- [ ] Documentar APIs no Swagger
- [ ] Criar guia de instalação Docker
- [ ] Documentar variáveis de ambiente
- [ ] Scripts de migração de dados
- [ ] CI/CD com GitHub Actions
- [ ] Dockerfile para produção
- [ ] Kubernetes manifests (opcional)

---

## 🗂️ ARQUIVOS A SEREM CRIADOS

### Infraestrutura
```
infra-local/
├── docker-compose.yml
├── .env.example
└── postgres/
    ├── init.sql
    └── backup/
```

### Backend
```
backend/
├── src/
│   ├── modules/
│   │   ├── gateway/
│   │   │   ├── gateway.controller.ts
│   │   │   ├── gateway.service.ts
│   │   │   ├── gateway.module.ts
│   │   │   └── entities/
│   │   ├── import/
│   │   │   ├── import.controller.ts
│   │   │   ├── import.service.ts
│   │   │   └── parsers/
│   │   ├── export/
│   │   │   ├── export.controller.ts
│   │   │   ├── export.service.ts
│   │   │   └── generators/
│   │   └── database/
│   │       ├── database.module.ts
│   │       └── migrations/
│   └── shared/
│       ├── dto/
│       ├── validators/
│       └── utils/
├── test/
├── .env.example
└── package.json
```

---

## 🔍 ANÁLISE DE IMPACTO

### Serviços a Migrar do Frontend
1. **OpenApiService** - Parser e validação
2. **ValidationService** - Regras de negócio
3. **PersistenceService** - Salvamento (agora via API)
4. **ElectronService** - Remover completamente
5. **TestService** - Mover geração de curl

### Componentes a Adaptar
1. **EditorComponent** - Consumir API REST
2. **EndpointModal** - Enviar dados via HTTP
3. **HomeComponent** - Upload via multipart
4. **NewGatewayComponent** - POST para criar

### Dependências a Remover
- electron
- electron-builder
- @electron/remote
- electron-store
- Todos os tipos do Electron

### Novas Dependências Backend
- @nestjs/core
- @nestjs/typeorm
- typeorm
- pg (PostgreSQL driver)
- multer
- adm-zip
- @apidevtools/swagger-parser
- js-yaml

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Preservação de Ordem
- Campo `sequence_order` INTEGER NOT NULL em `gateway_endpoints`
- Sempre ORDER BY sequence_order nas queries
- Reindexar ao reordenar endpoints
- Preservar ordem na exportação

### Sistema de Cache
- Hash SHA-256 do conteúdo
- Tabela `export_cache` com TTL
- Invalidar ao modificar config
- Retornar cache se não expirado

### Validações Críticas
- Unicidade: config_id + method + path
- Formato OpenAPI válido antes de salvar
- Tamanho máximo de upload (100MB)
- Rate limiting nas APIs

### Segurança
- Sanitização de inputs
- Proteção CSRF
- Rate limiting
- Validação de tipos TypeORM
- Logs de auditoria

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Migração de Dados**: Usuários existentes precisarão reimportar seus gateways
2. **Performance**: Implementar paginação desde o início
3. **Ordem**: CRÍTICO manter sequence_order em todas operações
4. **Cache**: Implementar desde o início para grandes arquivos
5. **Backup**: Scripts automáticos antes de operações destrutivas

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Frontend funciona 100% via APIs REST
- [ ] Zero dependências do Electron
- [ ] Docker Compose sobe ambiente completo
- [ ] Ordem dos endpoints sempre preservada
- [ ] Upload/Download funcionais
- [ ] Validações acontecem no backend
- [ ] Testes passando >80% cobertura
- [ ] Documentação Swagger completa

---

## 📅 CRONOGRAMA ESTIMADO

- **Semana 1**: Fases 1-3 (Infra + Setup + Modelo)
- **Semana 2**: Fases 4-7 (Módulos Backend)
- **Semana 3**: Fases 8-9 (Migração e Adaptação)
- **Semana 4**: Fases 10-12 (Limpeza e Testes)

---

## HISTÓRICO ANTERIOR (Electron + Angular)

Este documento contém o refinamento detalhado de todas as histórias necessárias para desenvolver o Editor de API Gateway (Electron + Angular), quebradas em tarefas menores e executáveis.

---

## ÉPICO 1: Setup Inicial do Projeto

### História 1.1: Configuração do Ambiente Base
**Como** desenvolvedor  
**Quero** configurar o ambiente base do projeto  
**Para** ter a estrutura inicial funcionando

#### Tarefas:
- [x] Criar estrutura de pastas do projeto
- [x] Inicializar package.json com npm init
- [x] Configurar TypeScript (tsconfig.json para app e electron)
- [x] Configurar ESLint e Prettier
- [x] Adicionar .gitignore apropriado
- [x] Configurar scripts npm básicos (dev, build, test, lint)
- [x] Adicionar arquivo .editorconfig
- [x] Configurar Husky para pre-commit hooks

### História 1.2: Setup do Angular
**Como** desenvolvedor  
**Quero** configurar o Angular 20+  
**Para** desenvolver a interface do aplicativo

#### Tarefas:
- [x] Instalar Angular CLI globalmente
- [x] Criar projeto Angular com ng new (dentro de src/app)
- [x] Configurar Angular Material
- [x] Adicionar suporte para SCSS
- [x] Configurar roteamento básico
- [x] Criar estrutura de módulos (core, shared, features)
- [x] Configurar ambiente de desenvolvimento e produção
- [x] Adicionar configuração para Monaco Editor

### História 1.3: Setup do Electron
**Como** desenvolvedor  
**Quero** configurar o Electron  
**Para** criar o aplicativo desktop

#### Tarefas:
- [x] Instalar Electron e electron-builder
- [x] Criar arquivo main.js para processo principal
- [x] Configurar preload script com context bridge
- [x] Implementar janela principal básica
- [x] Configurar hot reload para desenvolvimento
- [x] Adicionar configuração de segurança (CSP, nodeIntegration: false)
- [x] Criar scripts para build de produção
- [x] Configurar ícones e metadados do app

### História 1.4: Integração Angular + Electron
**Como** desenvolvedor  
**Quero** integrar Angular com Electron  
**Para** ter comunicação entre renderer e main process

#### Tarefas:
- [x] Configurar IPC (Inter-Process Communication)
- [x] Criar serviço Angular para comunicação com Electron
- [x] Implementar handlers IPC no processo principal
- [x] Criar tipos TypeScript para APIs expostas
- [x] Testar comunicação bidirecional
- [x] Configurar debugging para ambos os processos
- [x] Adicionar logs estruturados

---

## ÉPICO 2: Tela Inicial e Seleção de Repositório

### História 2.1: Interface da Tela Inicial
**Como** usuário  
**Quero** ver uma tela inicial clara  
**Para** escolher como abrir um projeto

#### Tarefas:
- [x] Criar componente HomePage
- [x] Implementar layout com Angular Material
- [x] Adicionar cards para as 3 opções (local, GitHub, novo)
- [x] Implementar navegação entre telas
- [x] Adicionar animações de entrada
- [x] Criar componente de histórico recente
- [x] Implementar estado de loading
- [x] Adicionar tratamento de erros

### História 2.2: Abrir Pasta Local
**Como** usuário  
**Quero** abrir uma pasta local  
**Para** editar contratos OpenAPI existentes

#### Tarefas:
- [x] Implementar dialog de seleção de pasta (Electron)
- [x] Criar handler IPC para leitura de filesystem
- [x] Buscar arquivos OpenAPI (yaml, yml, json)
- [x] Validar se é um arquivo OpenAPI válido
- [x] Carregar conteúdo na memória
- [x] Persistir caminho em preferências
- [x] Adicionar à lista de recentes
- [x] Implementar verificação de permissões

### História 2.3: Conectar com GitHub
**Como** usuário  
**Quero** conectar com repositório GitHub  
**Para** editar projetos versionados

#### Tarefas:
- [ ] Implementar fluxo OAuth do GitHub
- [ ] Criar tela de autenticação
- [ ] Armazenar token de forma segura (Electron secure storage)
- [ ] Implementar listagem de repositórios
- [ ] Adicionar busca e filtros de repos
- [ ] Implementar seleção de branch
- [ ] Baixar arquivo OpenAPI via Octokit
- [ ] Cache local de repositórios

### História 2.4: Criar Novo Gateway
**Como** usuário  
**Quero** criar um novo gateway do zero  
**Para** iniciar um novo projeto

#### Tarefas:
- [x] Criar formulário de metadados (reactive forms)
- [x] Implementar validação de campos
- [x] Gerar template OpenAPI 3.0 inicial
- [x] Permitir escolha entre JSON e YAML
- [x] Implementar preview do arquivo gerado
- [x] Salvar em local escolhido pelo usuário
- [x] Criar README.md inicial com seção ENDPOINTS
- [x] Adicionar templates pré-configurados

---

## ÉPICO 3: Visualização e Listagem de Endpoints

### História 3.1: Tabela de Endpoints
**Como** usuário  
**Quero** ver todos os endpoints em uma tabela  
**Para** ter visão geral da API

#### Tarefas:
- [x] Criar componente EndpointsTable
- [x] Implementar Material Table
- [x] Configurar colunas (id, method, path, actions)
- [x] Implementar ordenação por coluna
- [x] Adicionar paginação configurável
- [x] Implementar seleção de linhas
- [x] Adicionar ações em lote
- [x] Criar badges coloridos para métodos HTTP

### História 3.2: Busca e Filtros
**Como** usuário  
**Quero** buscar e filtrar endpoints  
**Para** encontrar rapidamente o que preciso

#### Tarefas:
- [x] Criar barra de busca com Material Input
- [x] Implementar busca em tempo real (debounce)
- [x] Buscar em: path, operationId, summary, description, tags
- [x] Criar filtros por método HTTP
- [x] Adicionar filtro por tags
- [x] Implementar filtro por x-extensions
- [x] Salvar filtros favoritos
- [x] Exportar resultados filtrados

### História 3.3: Parser do OpenAPI
**Como** sistema  
**Quero** parsear arquivos OpenAPI  
**Para** extrair informações dos endpoints

#### Tarefas:
- [x] Integrar @apidevtools/swagger-parser
- [x] Criar serviço OpenApiService
- [x] Implementar parsing de JSON e YAML
- [x] Resolver $ref automaticamente
- [x] Extrair lista de endpoints
- [x] Mapear para modelo interno
- [x] Tratar erros de parsing
- [x] Adicionar cache de parsing

---

## ÉPICO 4: Visualização de Endpoint Individual

### História 4.1: Modal de Visualização
**Como** usuário  
**Quero** visualizar detalhes de um endpoint  
**Para** entender sua configuração completa

#### Tarefas:
- [x] Criar componente EndpointViewModal
- [x] Integrar Monaco Editor
- [x] Configurar syntax highlighting para JSON/YAML
- [x] Implementar toggle JSON/YAML
- [x] Adicionar botão de copiar
- [x] Implementar exportação individual
- [x] Adicionar visualização em tela cheia
- [x] Implementar navegação entre endpoints

### História 4.2: Geração de Exemplos
**Como** usuário  
**Quero** ver exemplos de uso do endpoint  
**Para** entender como consumir a API

#### Tarefas:
- [x] Criar gerador de curl
- [x] Gerar exemplos para diferentes linguagens
- [x] Incluir headers e parâmetros
- [x] Gerar body de exemplo
- [x] Implementar cópia com um clique
- [x] Adicionar personalização de base URL
- [x] Gerar exemplos de resposta
- [x] Exportar como coleção Postman/Insomnia

---

## ÉPICO 5: Edição de Endpoints

### História 5.1: Modal de Edição - Estrutura Base
**Como** usuário  
**Quero** editar endpoints em um formulário  
**Para** não precisar editar JSON/YAML manualmente

#### Tarefas:
- [x] Criar componente EndpointEditModal
- [x] Implementar estrutura com tabs/accordions
- [x] Configurar navegação entre seções
- [x] Implementar estado do formulário (dirty/pristine)
- [x] Adicionar confirmação ao sair sem salvar
- [x] Implementar undo/redo
- [x] Adicionar validação em tempo real
- [x] Criar indicadores visuais de campos obrigatórios

### História 5.2: Aba Basic Information
**Como** usuário  
**Quero** editar informações básicas  
**Para** definir identificação do endpoint

#### Tarefas:
- [x] Criar formulário para operationId
- [x] Adicionar campo summary (com limite de caracteres)
- [x] Implementar editor rich text para description
- [x] Criar seletor de método HTTP
- [x] Validar formato do path
- [x] Implementar tags com autocomplete
- [x] Adicionar seletor de security schemes
- [x] Validar unicidade de operationId

### História 5.3: Aba Parameters
**Como** usuário  
**Quero** configurar parâmetros  
**Para** definir inputs do endpoint

#### Tarefas:
- [x] Criar seções para cada tipo (path, query, header, cookie)
- [x] Implementar lista dinâmica de parâmetros
- [x] Adicionar campos: name, type, required, description
- [x] Implementar editor de schema inline
- [x] Adicionar valores de exemplo
- [x] Validar nomes de parâmetros
- [x] Detectar parâmetros do path automaticamente
- [x] Implementar importação de schemas

### História 5.4: Aba Request Body
**Como** usuário  
**Quero** configurar o request body  
**Para** definir o payload de entrada

#### Tarefas:
- [x] Criar seletor de content-types
- [x] Implementar editor de JSON Schema
- [x] Adicionar validação de schema
- [x] Criar editor de exemplos
- [x] Implementar preview do schema
- [x] Adicionar templates de schemas comuns
- [x] Suportar upload de arquivo de schema
- [x] Gerar schema a partir de exemplo JSON

### História 5.5: Aba Responses
**Como** usuário  
**Quero** configurar responses  
**Para** definir outputs do endpoint

#### Tarefas:
- [x] Criar lista de response codes
- [x] Adicionar descrição por código
- [x] Implementar editor de schema por response
- [x] Adicionar exemplos por response
- [x] Criar templates de responses comuns
- [x] Validar códigos HTTP válidos
- [x] Implementar headers de response
- [x] Adicionar links entre responses

### História 5.6: Aba Integrations (AWS Specific)
**Como** usuário  
**Quero** configurar integrações AWS  
**Para** conectar com serviços backend

#### Tarefas:
- [x] Criar seletor de tipo (Lambda, HTTP, Mock, StepFunction)
- [x] Implementar formulário para Lambda (ARN, timeout, retry)
- [x] Adicionar configuração HTTP proxy (URL, method, headers)
- [x] Criar editor de Mock responses
- [x] Implementar StepFunction integration
- [x] Adicionar mapping templates
- [x] Configurar error handling
- [x] Implementar request/response transformations

### História 5.7: Aba Policies & Settings
**Como** usuário  
**Quero** configurar políticas  
**Para** controlar comportamento do endpoint

#### Tarefas:
- [x] Implementar throttling configuration
- [x] Adicionar cache settings
- [x] Criar configuração de CORS
- [x] Implementar API key requirement
- [x] Adicionar rate limiting
- [x] Configurar request validation
- [x] Implementar custom authorizers
- [x] Adicionar métricas e logs

### História 5.8: Aba Advanced
**Como** usuário  
**Quero** configurar opções avançadas  
**Para** customizar completamente o endpoint

#### Tarefas:
- [x] Criar editor para x-extensions
- [x] Implementar tags de deploy
- [x] Adicionar stage variables
- [x] Configurar documentation parts
- [x] Implementar request validators
- [x] Adicionar custom headers
- [x] Criar configuração de SDK generation
- [x] Implementar vendor extensions

---

## ÉPICO 6: Criação e Exclusão de Endpoints

### História 6.1: Criar Novo Endpoint
**Como** usuário  
**Quero** criar novos endpoints  
**Para** expandir minha API

#### Tarefas:
- [x] Adicionar botão "Novo Endpoint" na tabela
- [x] Abrir modal em modo criação
- [x] Pré-popular com valores padrão
- [x] Validar antes de salvar
- [x] Adicionar ao contrato OpenAPI
- [x] Atualizar tabela após criação
- [x] Mostrar notificação de sucesso
- [x] Adicionar opção de criar similar

### História 6.2: Excluir Endpoints
**Como** usuário  
**Quero** excluir endpoints  
**Para** remover funcionalidades obsoletas

#### Tarefas:
- [x] Adicionar ação de exclusão na tabela
- [x] Implementar confirmação de exclusão
- [x] Permitir exclusão em lote
- [x] Remover do contrato OpenAPI
- [ ] Atualizar README.md
- [x] Implementar soft delete (lixeira)
- [x] Adicionar opção de desfazer
- [x] Logar exclusões

---

## ÉPICO 7: Persistência e Versionamento

### História 7.1: Salvar Alterações Locais
**Como** usuário  
**Quero** salvar alterações no filesystem  
**Para** persistir meu trabalho localmente

#### Tarefas:
- [x] Implementar handler IPC para escrita
- [x] Serializar OpenAPI mantendo formato original
- [x] Preservar comentários em YAML
- [x] Criar backup antes de sobrescrever
- [x] Implementar save e save as
- [x] Adicionar auto-save configurável
- [x] Mostrar indicador de alterações não salvas
- [x] Implementar recuperação de crash

### História 7.2: Atualizar README.md
**Como** sistema  
**Quero** atualizar o README automaticamente  
**Para** manter documentação sincronizada

#### Tarefas:
- [x] Parsear README.md existente
- [x] Localizar seção ENDPOINTS
- [x] Gerar bloco markdown para endpoint
- [x] Incluir exemplo curl formatado
- [x] Adicionar timestamp ISO 8601
- [x] Fazer merge com entradas existentes
- [x] Preservar outras seções do README
- [x] Adicionar criação se não existir

### História 7.3: Integração Git Local
**Como** usuário  
**Quero** commitar alterações  
**Para** versionar meu trabalho

#### Tarefas:
- [ ] Detectar se pasta é repositório git
- [ ] Mostrar status do git
- [ ] Implementar stage de arquivos
- [ ] Criar formulário de commit
- [ ] Gerar mensagem padronizada
- [ ] Executar commit via CLI
- [ ] Mostrar histórico de commits
- [ ] Implementar diff viewer

### História 7.4: Integração GitHub
**Como** usuário  
**Quero** sincronizar com GitHub  
**Para** colaborar com equipe

#### Tarefas:
- [ ] Implementar push para GitHub
- [ ] Criar branches via Octokit
- [ ] Implementar criação de PR
- [ ] Adicionar template de PR
- [ ] Mostrar status de CI/CD
- [ ] Implementar pull de alterações
- [ ] Resolver conflitos simples
- [ ] Adicionar comentários em PR

---

## ÉPICO 8: Validação e Qualidade

### História 8.1: Validação de OpenAPI
**Como** sistema  
**Quero** validar o contrato  
**Para** garantir conformidade com spec

#### Tarefas:
- [x] Integrar swagger-parser validation
- [x] Mostrar erros em tempo real
- [ ] Destacar campos com erro
- [ ] Implementar quick fixes
- [x] Validar referências ($ref)
- [ ] Checar breaking changes
- [x] Adicionar validação customizada
- [x] Exportar relatório de validação

### História 8.2: Linting com Spectral
**Como** sistema  
**Quero** aplicar regras de lint  
**Para** manter qualidade do contrato

#### Tarefas:
- [x] Integrar @stoplight/spectral
- [x] Configurar regras padrão
- [x] Permitir regras customizadas
- [x] Mostrar warnings e errors
- [ ] Implementar auto-fix onde possível
- [ ] Adicionar exceções por endpoint
- [x] Criar relatório de lint
- [x] Bloquear save se houver erros críticos

---

## ÉPICO 9: Preview e Testes

### História 9.1: Preview do Contrato
**Como** usuário  
**Quero** preview do OpenAPI completo  
**Para** revisar antes de salvar

#### Tarefas:
- [x] Criar modal de preview
- [x] Mostrar em Monaco Editor
- [x] Implementar diff com versão salva
- [x] Adicionar syntax highlighting
- [x] Permitir edição manual
- [x] Validar após edição manual
- [x] Exportar para arquivo
- [ ] Gerar documentação HTML

### História 9.2: Teste de Endpoints
**Como** usuário  
**Quero** testar endpoints  
**Para** validar implementação

#### Tarefas:
- [ ] Criar cliente HTTP interno
- [ ] Implementar formulário de request
- [ ] Permitir customização de headers
- [ ] Adicionar autenticação configurável
- [ ] Mostrar response formatada
- [ ] Medir tempo de resposta
- [ ] Salvar requests como exemplos
- [ ] Implementar coleção de testes

---

## ÉPICO 10: UI/UX e Experiência do Usuário

### História 10.1: Tema e Aparência
**Como** usuário  
**Quero** interface moderna e intuitiva  
**Para** trabalhar confortavelmente

#### Tarefas:
- [ ] Implementar tema claro/escuro
- [ ] Criar paleta de cores consistente
- [ ] Adicionar ícones para ações
- [ ] Implementar tooltips informativos
- [ ] Criar animações suaves
- [ ] Adicionar feedback visual
- [ ] Implementar responsive design
- [ ] Criar onboarding tour

### História 10.2: Atalhos de Teclado
**Como** usuário  
**Quero** usar atalhos  
**Para** trabalhar mais rápido

#### Tarefas:
- [ ] Mapear atalhos principais
- [ ] Implementar handler de teclado
- [ ] Criar cheat sheet de atalhos
- [ ] Permitir customização
- [ ] Adicionar atalhos contextuais
- [ ] Implementar command palette
- [ ] Criar modo vim opcional
- [ ] Adicionar navegação por teclado

### História 10.3: Preferências e Configurações
**Como** usuário  
**Quero** personalizar a aplicação  
**Para** adaptar ao meu workflow

#### Tarefas:
- [ ] Criar tela de configurações
- [ ] Implementar preferências de editor
- [ ] Adicionar configuração de Git
- [ ] Permitir templates customizados
- [ ] Configurar auto-save
- [ ] Adicionar configuração de proxy
- [ ] Implementar perfis de usuário
- [ ] Exportar/importar configurações

---

## ÉPICO 11: Performance e Otimização

### História 11.1: Otimização de Performance
**Como** usuário  
**Quero** aplicação rápida  
**Para** não perder produtividade

#### Tarefas:
- [ ] Implementar lazy loading de módulos
- [ ] Adicionar virtual scrolling na tabela
- [ ] Otimizar re-renders do Angular
- [ ] Implementar cache de parsing
- [ ] Adicionar web workers para parsing
- [ ] Otimizar bundle size
- [ ] Implementar code splitting
- [ ] Adicionar preload de recursos

### História 11.2: Gerenciamento de Memória
**Como** sistema  
**Quero** gerenciar memória eficientemente  
**Para** evitar memory leaks

#### Tarefas:
- [ ] Implementar cleanup de subscriptions
- [ ] Adicionar garbage collection hints
- [ ] Limitar cache size
- [ ] Implementar LRU cache
- [ ] Monitorar uso de memória
- [ ] Adicionar alertas de memória
- [ ] Implementar modo low memory
- [ ] Otimizar estruturas de dados

---

## ÉPICO 12: Testes e Qualidade

### História 12.1: Testes Unitários
**Como** desenvolvedor  
**Quero** testes unitários  
**Para** garantir qualidade do código

#### Tarefas:
- [ ] Configurar Jest para Angular
- [ ] Criar testes para services
- [ ] Testar componentes isolados
- [ ] Adicionar testes para parsers
- [ ] Testar validações
- [ ] Implementar mocks
- [ ] Atingir 80% cobertura
- [ ] Adicionar relatório de cobertura

### História 12.2: Testes E2E
**Como** desenvolvedor  
**Quero** testes end-to-end  
**Para** validar fluxos completos

#### Tarefas:
- [ ] Configurar Playwright
- [ ] Testar fluxo de abrir projeto
- [ ] Testar CRUD de endpoints
- [ ] Validar persistência
- [ ] Testar integração GitHub
- [ ] Verificar validações
- [ ] Testar atalhos
- [ ] Adicionar screenshots em falhas

### História 12.3: CI/CD Pipeline
**Como** equipe  
**Quero** pipeline automatizado  
**Para** garantir qualidade contínua

#### Tarefas:
- [ ] Configurar GitHub Actions
- [ ] Adicionar job de lint
- [ ] Executar testes unitários
- [ ] Rodar testes E2E
- [ ] Verificar build
- [ ] Adicionar análise de código
- [ ] Implementar release automático
- [ ] Configurar notificações

---

## ÉPICO 13: Distribuição e Deploy

### História 13.1: Build e Empacotamento
**Como** desenvolvedor  
**Quero** gerar instaladores  
**Para** distribuir a aplicação

#### Tarefas:
- [ ] Configurar electron-builder
- [ ] Gerar instalador Windows (exe/msi)
- [ ] Criar DMG para macOS
- [ ] Gerar AppImage/deb para Linux
- [ ] Adicionar assinatura de código
- [ ] Implementar auto-update
- [ ] Criar portable version
- [ ] Otimizar tamanho do instalador

### História 13.2: Documentação
**Como** usuário  
**Quero** documentação completa  
**Para** aprender a usar a aplicação

#### Tarefas:
- [ ] Criar documentação de usuário
- [ ] Adicionar guia de início rápido
- [ ] Documentar todos os recursos
- [ ] Criar vídeos tutoriais
- [ ] Adicionar FAQ
- [ ] Criar documentação de API
- [ ] Adicionar exemplos de uso
- [ ] Implementar help integrado

---

## Perguntas Pendentes para o Usuário

Antes de iniciar o desenvolvimento, preciso esclarecer alguns pontos:

### Arquitetura e Tecnologia
1. **Versão do Node.js**: Qual versão mínima devemos suportar?
2. **Versão do Electron**: Usar a última estável ou alguma específica?
3. **Estado Global**: Preferência entre RxJS simples ou NgRx?
4. **Testes**: Jest ou Karma para unitários? Playwright ou Cypress para E2E?

### Funcionalidades
1. **Autenticação GitHub**: OAuth App ou GitHub App?
2. **Multi-idioma**: Aplicação precisa de internacionalização (i18n)?
3. **Modo Offline**: Deve funcionar completamente offline?
4. **Sincronização**: Precisa sincronização em tempo real com GitHub?

### Integrações AWS
1. **AWS SDK**: Integração direta com AWS para testar endpoints?
2. **IAM**: Suporte para assumir roles IAM?
3. **Regiões**: Suporte multi-região?
4. **CloudFormation**: Gerar templates CloudFormation?

### UI/UX
1. **Tema**: Apenas claro/escuro ou temas customizáveis?
2. **Idioma**: Português, inglês ou ambos?
3. **Ícones**: Conjunto específico de ícones?
4. **Fonte**: Preferência de tipografia?

### Distribuição
1. **Plataformas**: Windows, macOS e Linux ou apenas algumas?
2. **Auto-update**: Implementar atualização automática?
3. **Licença**: Qual tipo de licença para o projeto?
4. **Telemetria**: Coletar métricas de uso (com consentimento)?

### Segurança
1. **Certificados**: Como gerenciar certificados SSL personalizados?
2. **Proxy**: Suporte para proxy corporativo?
3. **2FA**: Implementar autenticação de dois fatores?
4. **Criptografia**: Criptografar dados locais sensíveis?

### Performance
1. **Tamanho máximo**: Qual tamanho máximo de arquivo OpenAPI suportado?
2. **Endpoints**: Quantos endpoints máximos por arquivo?
3. **Histórico**: Manter quantas versões de histórico/undo?

---

## Priorização Sugerida

### MVP (Fase 1) - 4-6 semanas
1. Setup inicial (Épico 1)
2. Tela inicial e abrir pasta local (Épico 2, histórias 2.1 e 2.2)
3. Visualização de endpoints (Épico 3)
4. Edição básica de endpoints (Épico 5, histórias 5.1-5.5)
5. Salvar alterações locais (Épico 7, história 7.1)

### Fase 2 - 3-4 semanas
1. Criar novo gateway (Épico 2, história 2.4)
2. Criar/excluir endpoints (Épico 6)
3. Atualizar README.md (Épico 7, história 7.2)
4. Validação básica (Épico 8, história 8.1)
5. Testes unitários core (Épico 12, história 12.1)

### Fase 3 - 3-4 semanas
1. Integração GitHub (Épico 2, história 2.3 e Épico 7, histórias 7.3-7.4)
2. Integrações AWS (Épico 5, história 5.6)
3. Políticas e configurações avançadas (Épico 5, histórias 5.7-5.8)
4. Preview e testes (Épico 9)

### Fase 4 - 2-3 semanas
1. UI/UX refinements (Épico 10)
2. Performance (Épico 11)
3. Testes E2E (Épico 12, história 12.2)
4. CI/CD (Épico 12, história 12.3)

### Fase 5 - 2 semanas
1. Build e distribuição (Épico 13, história 13.1)
2. Documentação (Épico 13, história 13.2)
3. Polimento final
4. Beta testing

---

## Definição de Pronto (DoD)

Para considerar uma história completa:

- [ ] Código implementado e funcionando
- [ ] Testes unitários com cobertura > 80%
- [ ] Testes E2E para fluxos críticos
- [ ] Código passa no lint sem warnings
- [ ] TypeScript sem erros de compilação
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Testado em Windows, macOS e Linux
- [ ] Performance dentro dos limites aceitáveis
- [ ] Acessibilidade verificada
- [ ] Sem memory leaks detectados

---

## Riscos e Mitigações

### Riscos Técnicos
1. **Compatibilidade Electron-Angular**: Mitigar com testes frequentes
2. **Performance com arquivos grandes**: Implementar parsing incremental
3. **Conflitos de merge em YAML**: Usar algoritmos de merge especializados
4. **Rate limits GitHub API**: Implementar cache e retry logic

### Riscos de Negócio
1. **Mudanças na spec OpenAPI**: Abstrair parser para fácil atualização
2. **Mudanças na API do GitHub**: Usar versão estável da API
3. **Requisitos de segurança corporativa**: Desenhar com segurança em mente

---

## Métricas de Sucesso

- Tempo de abertura de arquivo < 2 segundos
- Tempo de resposta de UI < 100ms
- Memory footprint < 200MB
- Crash rate < 0.1%
- Cobertura de testes > 80%
- Satisfação do usuário > 4.5/5

---

Este documento será atualizado conforme o projeto evolui e novos requisitos surgem.