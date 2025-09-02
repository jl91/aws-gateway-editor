# Editor de API Gateway (Electron + Angular)

> Aplicação desktop para editar contratos OpenAPI (JSON / YAML) de API Gateways.
> Foco: abrir repositórios (pasta local ou GitHub), criar/editar meta-dados do gateway e gerenciar endpoints (CRUD). Toda alteração em endpoints atualiza o contrato OpenAPI e registra um *HTTP dump* (ex.: `curl`) na seção `ENDPOINTS` do `README.md` do repositório.

---

## Sumário

* [Visão Geral](#visão-geral)
* [Fluxos Principais](#fluxos-principais)
* [Formulário de Edição/Criação de Endpoint](#formulário-de-ediçãocriação-de-endpoint)
* [Persistência e Integração Git](#persistência-e-integração-git)
* [Validações e Regras](#validações-e-regras)
* [UI / Estética](#ui--estética)
* [Arquitetura Técnica](#arquitetura-técnica)
* [Critérios de Aceitação](#critérios-de-aceitação)
* [Exemplo OpenAPI para testes](#exemplo-openapi-para-testes)
* [Contribuição](#contribuição)
* [Licença](#licença)

---

## Visão Geral

Este projeto fornece um editor desktop (Electron + Angular) especializado em contratos OpenAPI (v3.x). A aplicação simplifica o fluxo de trabalho de times que mantêm API Gateways: abrir um contrato existente, editar endpoints com um UI rico (modal com seções), validar o contrato, persistir alterações e versionar via Git/GitHub.

O foco é exclusivamente o contrato (OpenAPI JSON/YAML) e a descrição das integrações/atributos que um endpoint pode ter em um API Gateway.

---

## Fluxos Principais

### 1. Tela inicial — Seleção do repositório

Opções:

* **Abrir pasta local** (leitura/escrita direto no filesystem via processo principal do Electron).
* **Conectar repositório GitHub** (OAuth / token — usar Octokit).
* **Criar novo gateway** (inicia formulário para meta-dados e cria novo arquivo OpenAPI).

Ao abrir um repo, a aplicação procura por `openapi.yaml`, `openapi.yml` ou `openapi.json` e carrega o contrato.

### 2. Criar novo gateway

Formulário com meta-dados (ex.: `name`, `version`, `baseUrl`, `maintainers`, `description`, `defaultStage`, `auth`, `cors`, `license`, `contact`).

Salvar gera um arquivo OpenAPI v3.x inicial no repositório/local.

### 3. Tela de gerenciamento de endpoints

* **Tabela (Material Table)** com colunas: `id` | `http method` | `path` | `actions`.
* **Barra de pesquisa** que filtra por `path`, `operationId`, `summary`, `description`, `tags` e `x-` metas.
* **Paginação**, ordenação e seleção múltipla.

### 4. Ações por endpoint

* **Visualizar configuração**: modal/sidepanel com Monaco Editor (JSON/YAML) e opção de copiar/exportar.
* **Editar endpoint**: modal Material com abas/accordions para todos os atributos.
* **Excluir endpoint**: confirmação + remoção do contrato OpenAPI e commit/PR quando aplicável.

---

## Formulário de edição/criação de endpoint (modal)

Organizado em abas ou accordions:

1. **Basic**: `operationId`, `summary`, `description`, `tags`, `http method`, `path`, `security`.
2. **Parameters**:

   * Path params, Query params, Header params, Cookie params — cada um com `name`, `schema`, `required`, `description`, `example`.
3. **Request Body**:

   * Content types, schema editor (JSON Schema) com validação, examples.
4. **Responses**: código, description, content (schema + examples).
5. **Integrations**: `Lambda`, `HTTP proxy`, `Mock`, `StepFunction` — configurar ARN/URL/templating/timeout/retries.
6. **Policies / Settings**: throttling, caching, mapping templates, transformações.
7. **Advanced**: `x-` extensions, deploy tags/stages.
8. **Preview / Test**: gerar exemplo `curl` e opção de enviar request de teste (apenas se usuário habilitar).

> O editor deve fornecer validação inline e impedir salvar enquanto houver erros críticos (ex.: schema inválido, parâmetros conflitantes).

---

## Persistência e Integração Git

* **Pasta local**: usar Node `fs` (Electron main) para leitura/edição do arquivo OpenAPI e `README.md`.
* **GitHub**: usar `@octokit/rest` para autenticação, leitura e escrita. Opções:

  * Commit direto na branch (configurável).
  * Criar branch + Pull Request (opção recomendada para produção).

### Regras de persistência

1. Validar o documento com `swagger-parser` / `@apidevtools/swagger-parser` antes de persistir.
2. Serializar em JSON ou YAML mantendo o formato de origem quando possível.
3. Mensagem de commit padronizada: `feat(gateway): <ação> <method> <path> — by Editor`

### README.md — seção `ENDPOINTS`

Sempre que um endpoint for criado ou alterado, a aplicação deve adicionar ou atualizar uma entrada na seção `## ENDPOINTS` do `README.md` do repositório com um bloco de código contendo um `curl` de exemplo.

Formato sugerido (exemplo):

````markdown
## ENDPOINTS

- **id:** getUsers
  **method:** GET
  **path:** /users
  **summary:** Retorna lista de usuários
  **modified:** 2025-08-20T12:34:56-03:00

```bash
curl -X GET 'https://api.example.com/users?limit=10' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <TOKEN>'
````

````

Regras:

- Se já existir entrada para o mesmo `id` — atualizar (merge); caso contrário, adicionar no topo.
- Timestamp em ISO 8601 com timezone.

---

## Validações e Regras

- Suporte: OpenAPI v3.0+ (compatibilidade preferencial v3.1).
- Validar unicidade de `paths` por `method`.
- Detectar conflitos entre parâmetros (ex.: mesmo nome em header vs query).
- Resolver `$ref` e validar schemas JSON.
- Converter JSON ↔ YAML mantendo ordenação e comentários quando possível.
- Executar lint (`spectral`) e bloquear commits em caso de erros críticos.

---

## UI / Estética

- Angular + Angular Material (Material Table).
- `http method` representado por badges/ícones inspirados no Insomnia (GET, POST, PUT, DELETE, PATCH, etc.).
- Tabela com busca global + filtros por method/tag/stage.
- Monaco Editor para JSON/YAML com autocomplete e esquema OpenAPI.
- Shortcuts e menu contextual (ex.: `e` editar, `v` visualizar).

---

## Arquitetura Técnica (sugestão)

- **Electron (Main)**: gerencia FS local, chamadas GitHub (Octokit), commits/PRs, operações sensíveis. Comunicação via IPC com o renderer.
- **Renderer (Angular)**:
  - Services principais: `OpenApiService`, `RepoService`, `SearchService`.
  - State: RxJS + BehaviorSubjects (opcional: NgRx se necessário).
  - Componentes: `RepoSelector`, `GatewayEditor`, `EndpointsTable`, `EndpointModal`, `YamlViewer`.

### Bibliotecas recomendadas

- `@apidevtools/swagger-parser` ou `swagger-parser`
- `js-yaml`
- `monaco-editor`
- `@octokit/rest`
- `@stoplight/spectral` (lint)
- `material-table` / Angular Material Table

---

## Critérios de Aceitação (Definition of Done)

1. Ao abrir repositório local ou GitHub, o app carrega o contrato OpenAPI e exibe a tabela de endpoints.
2. Usuário consegue criar/editar/excluir endpoints via modal; alterações são refletidas no arquivo OpenAPI validado.
3. Cada criação/alteração gera/atualiza uma entrada na seção `ENDPOINTS` do `README.md` com exemplo `curl` e timestamp ISO.
4. Tabela suporta busca por path e metadados; colunas exibidas: `id`, `method`, `path`, `actions`.
5. Visualização em JSON/YAML (Monaco) com opção de copiar/exportar.
6. Para repositórios GitHub, commits ou PRs são criados corretamente com mensagem padronizada.
7. Lint do OpenAPI executado antes de persistir; erros bloqueantes impedem o commit.
8. UI representa métodos HTTP por badges/ícones estilo Insomnia e é responsiva.

---

## Exemplo OpenAPI (para testes iniciais)

```yaml
openapi: 3.0.3
info:
  title: Gateway Exemplo
  version: "1.0.0"
paths:
  /users:
    get:
      operationId: getUsers
      summary: Retorna lista de usuários
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
````

---

## Testes e Qualidade

* Unit tests para serviços críticos (parser, persistência) com Jest ou Karma.
* E2E com Playwright cobrindo fluxos: abrir repo, criar endpoint, validar README.
* CI: rodar lint (`spectral`) + testes antes de permitir PR merge.

---

## Exemplo de mensagens de commit

* `feat(gateway): add endpoint POST /users — by Editor`
* `fix(gateway): validate schema for GET /items — by Editor`
* `chore(gateway): update README ENDPOINTS — by Editor`

---

## Contribuição

1. Abra um issue descrevendo a proposta.
2. Crie uma branch com prefixo `feat/` ou `fix/`.
3. Adicione testes quando pertinente.
4. Crie um PR apontando para `develop` (ou a branch principal do projeto) e aguarde revisão.

---

## Licença

Licença a definir — adicionar arquivo `LICENSE` no repositório conforme política da organização.

---

## 📋 Status do Desenvolvimento

### ✅ Épico 1: Setup Inicial do Projeto - COMPLETO

- **História 1.1**: Configuração do Ambiente Base ✅
- **História 1.2**: Setup do Angular ✅  
- **História 1.3**: Setup do Electron ✅
- **História 1.4**: Integração Angular + Electron ✅

### ✅ Épico 2: Tela Inicial e Seleção de Repositório - COMPLETO

- **História 2.1**: Interface da Tela Inicial ✅
- **História 2.2**: Abrir Pasta Local ✅
- **História 2.3**: Conectar com GitHub (parcial - interface criada)
- **História 2.4**: Criar Novo Gateway ✅

### ✅ Épico 3: Visualização e Listagem de Endpoints - COMPLETO

- **História 3.1**: Tabela de Endpoints ✅
  - Material Table com ordenação, paginação e seleção
  - Badges coloridos para métodos HTTP
  - Ações em lote implementadas
- **História 3.2**: Busca e Filtros ✅
  - Busca em tempo real com debounce
  - Filtros por método HTTP e tags
  - Exportação para CSV
- **História 3.3**: Parser do OpenAPI ✅
  - Integração com swagger-parser
  - Suporte para JSON e YAML
  - Resolução automática de $ref

### ✅ Épico 4: Visualização de Endpoint Individual - COMPLETO

- Modal de visualização com Monaco Editor
- Múltiplas abas para organização
- Geração de exemplos cURL

### ✅ Épico 5: Edição de Endpoints - COMPLETO

- Modal de edição completo com formulários reativos
- Suporte para parâmetros, request body e responses
- Validação em tempo real
- Modo de visualização, edição e criação

### 🚧 Próximos Épicos

- [ ] Épico 6: Criação e Exclusão de Endpoints (parcialmente completo)
- [ ] Épico 7: Persistência e Versionamento
- [ ] Épico 8: Validação e Qualidade

---

## ENDPOINTS

(Esta seção será preenchida automaticamente quando endpoints forem criados)
