# Sistema de Gerenciamento de API Gateway - Especificação Completa

## 📋 Visão Geral
Sistema web para gerenciamento de configurações de API Gateway com arquitetura cliente-servidor, permitindo importação, edição, versionamento e exportação de configurações.

## 🏗️ Arquitetura

### Estrutura de Pastas
```
project-root/
├── infra-local/          # Infraestrutura Docker
│   ├── docker-compose.yml
│   ├── postgres/
│   │   ├── init.sql
│   │   └── backup/
│   └── .env.example
├── backend/              # API NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── gateway/
│   │   │   ├── import/
│   │   │   ├── export/
│   │   │   └── database/
│   │   └── shared/
│   └── package.json
├── frontend/             # como eh hoje
└── README.md
```

## 🔧 Stack Tecnológica

### Backend
- **Framework**: NestJS
- **Banco de Dados**: PostgreSQL 15+
- **ORM**: TypeORM 
- **Upload**: Multer
- **Compressão**: node-archiver / adm-zip

### Frontend
- **Framework**: Angular (frontend "burro" - sem lógica de negócio)
- **HTTP Client**: Angular Http Client
- **UI**: Material-UI 

### Infraestrutura
- **Containerização**: Docker & Docker Compose
- **Volumes**: Persistência de dados PostgreSQL
- **Network**: Bridge network para comunicação entre containers

## 📊 Modelo de Dados

### Tabelas Principais

```sql
-- Configurações do Gateway
CREATE TABLE gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    file_hash VARCHAR(64) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false
);

-- Endpoints do Gateway
CREATE TABLE gateway_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES gateway_configs(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    target_url TEXT,
    headers JSONB,
    query_params JSONB,
    body_schema JSONB,
    response_schema JSONB,
    authentication JSONB,
    rate_limiting JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(config_id, sequence_order)
);

-- Histórico de Importações
CREATE TABLE import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES gateway_configs(id),
    file_name VARCHAR(255),
    file_size BIGINT,
    import_status VARCHAR(50),
    error_details TEXT,
    imported_at TIMESTAMP DEFAULT NOW(),
    imported_by VARCHAR(255)
);

-- Arquivos Exportados (Cache)
CREATE TABLE export_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES gateway_configs(id),
    file_hash VARCHAR(64) UNIQUE,
    file_content BYTEA,
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

## 🔌 API Endpoints

### Gateway Management
```typescript
POST   /api/gateway/import          // Upload ZIP e importa configuração
GET    /api/gateway/configs         // Lista todas configurações
GET    /api/gateway/configs/:id     // Detalhes de uma configuração
PUT    /api/gateway/configs/:id     // Atualiza configuração
DELETE /api/gateway/configs/:id     // Remove configuração
POST   /api/gateway/configs/:id/activate  // Ativa configuração

### Endpoints Management
GET    /api/gateway/:configId/endpoints     // Lista endpoints (ordem preservada)
POST   /api/gateway/:configId/endpoints     // Adiciona endpoint
PUT    /api/gateway/:configId/endpoints/:id // Atualiza endpoint
DELETE /api/gateway/:configId/endpoints/:id // Remove endpoint
PUT    /api/gateway/:configId/endpoints/reorder // Reordena endpoints

### Export/Download
GET    /api/gateway/export/:configId  // Gera e baixa arquivo do gateway
GET    /api/gateway/export/:configId/status  // Verifica se há cache válido

### Infrastructure
GET    /api/health                   // Health check
POST   /api/database/recreate        // Recria estrutura do banco
GET    /api/database/backup          // Gera backup
POST   /api/database/restore         // Restaura backup
```

## 🚀 Funcionalidades Principais

### 1. Importação de Configuração (ZIP Upload)
- Frontend envia arquivo ZIP via multipart/form-data
- Backend descompacta e processa arquivo
- Valida estrutura do API Gateway
- Persiste configuração mantendo ordem dos endpoints
- Calcula hash do arquivo para evitar duplicatas

### 2. Preservação de Ordem dos Endpoints
- Campo `sequence_order` garante ordem original
- Queries sempre ordenam por `sequence_order`
- Interface permite reordenação via drag-and-drop
- Exportação respeita ordem definida

### 3. Geração/Export do Gateway
- Verifica cache de exportação via hash
- Se não existe cache ou expirou:
  - Reconstrói arquivo do banco
  - Mantém ordem original dos endpoints
  - Gera novo cache
- Retorna arquivo para download

### 4. Recriação da Infraestrutura
- Script SQL inicial cria estrutura
- Migrations versionadas (TypeORM/Prisma)
- Comando para reset completo do banco
- Backup/Restore automático

## 📝 Tarefas de Implementação

### Fase 1: Infraestrutura Base
- [ ] Configurar docker-compose com PostgreSQL
- [ ] Criar script init.sql com estrutura inicial
- [ ] Configurar volumes para persistência
- [ ] Criar .env.example com variáveis necessárias
- [ ] Adicionar scripts de backup/restore

### Fase 2: Backend Core
- [ ] Inicializar projeto NestJS
- [ ] Configurar TypeORM/Prisma com PostgreSQL
- [ ] Implementar módulo de Database com migrations
- [ ] Criar DTOs e entities base
- [ ] Configurar Swagger para documentação

### Fase 3: Módulo de Importação
- [ ] Configurar Multer para upload de arquivos
- [ ] Implementar descompactação de ZIP
- [ ] Parser para formato do API Gateway
- [ ] Validação de estrutura
- [ ] Persistência com ordem preservada
- [ ] Tratamento de erros e logs

### Fase 4: Módulo de Gerenciamento
- [ ] CRUD de configurações
- [ ] CRUD de endpoints com ordem
- [ ] Sistema de ativação de configuração
- [ ] Versionamento de configurações
- [ ] Histórico de alterações

### Fase 5: Módulo de Exportação
- [ ] Gerador de arquivo do gateway
- [ ] Sistema de cache com hash
- [ ] Verificação de alterações
- [ ] Endpoint de download
- [ ] Compactação opcional

### Fase 6: Frontend Base
- [ ] Setup do projeto (React/Vue/Angular)
- [ ] Configurar cliente HTTP
- [ ] Service layer para todas APIs
- [ ] Componente de upload
- [ ] Lista de configurações

### Fase 7: Frontend Features
- [ ] Visualizador de endpoints
- [ ] Editor de endpoints com drag-and-drop
- [ ] Botão de download com status
- [ ] Indicadores de versão ativa
- [ ] Notifications/Toasts

### Fase 8: Testes e Documentação
- [ ] Testes unitários backend
- [ ] Testes de integração
- [ ] Testes E2E básicos
- [ ] Documentação de API
- [ ] README com instruções de setup

### Fase 9: Otimizações
- [ ] Índices no banco de dados
- [ ] Paginação de endpoints
- [ ] Compressão de responses
- [ ] Rate limiting
- [ ] Monitoramento com health checks

### Fase 10: Features Avançadas
- [ ] Diff visual entre versões
- [ ] Rollback de configurações
- [ ] Webhooks para mudanças
- [ ] API de validação
- [ ] Modo dry-run para importação

## 🔐 Considerações de Segurança
- Validação de tamanho máximo de upload
- Sanitização de inputs
- Proteção contra SQL injection (via ORM)
- Rate limiting nos endpoints
- Validação de formato de arquivo
- Autenticação/Autorização (futuro)

## 🎯 Critérios de Aceitação
1. ✅ Upload de ZIP funcional com feedback de progresso
2. ✅ Ordem dos endpoints preservada do arquivo original
3. ✅ Download gera arquivo idêntico se não houve mudanças
4. ✅ Frontend não possui lógica de negócio
5. ✅ Banco pode ser recriado do zero via migrations
6. ✅ Docker-compose sobe ambiente completo
7. ✅ Todas operações via API REST
8. ✅ Diff mínimo ao regenerar arquivo

## 📚 Scripts Úteis

### Package.json do Backend
```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "migration:generate": "typeorm migration:generate",
    "migration:run": "typeorm migration:run",
    "db:reset": "npm run migration:revert && npm run migration:run",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### Docker Commands
```bash
# Subir infraestrutura
docker-compose -f infra-local/docker-compose.yml up -d

# Backup do banco
docker-compose exec postgres pg_dump -U user dbname > backup.sql

# Restore do banco
docker-compose exec -T postgres psql -U user dbname < backup.sql

# Logs
docker-compose logs -f backend
```

## 🚦 Definição de Pronto
- [ ] Código revisado e aprovado
- [ ] Testes passando (>80% cobertura)
- [ ] Documentação atualizada
- [ ] Deploy em ambiente de desenvolvimento
- [ ] Validação com arquivo real de API Gateway