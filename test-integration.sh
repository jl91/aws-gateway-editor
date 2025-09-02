#!/bin/bash

# Script de teste da integração completa do sistema
# Testa a comunicação entre frontend Angular e backend NestJS

set -e

echo "========================================"
echo "🚀 Teste de Integração - API Gateway Editor"
echo "========================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se um serviço está rodando
check_service() {
    local service=$1
    local port=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $service está rodando na porta $port"
        return 0
    else
        echo -e "${RED}✗${NC} $service não está rodando na porta $port"
        return 1
    fi
}

# Passo 1: Verificar Docker
echo "1. Verificando Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker instalado"
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker daemon está rodando"
    else
        echo -e "${RED}✗${NC} Docker daemon não está rodando. Execute: sudo systemctl start docker"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Docker não está instalado"
    exit 1
fi
echo ""

# Passo 2: Subir infraestrutura
echo "2. Subindo infraestrutura Docker..."
cd infra-local

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}!${NC} Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
fi

echo "Iniciando containers..."
docker-compose up -d

# Aguardar PostgreSQL estar pronto
echo "Aguardando PostgreSQL inicializar..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U gateway_user -d gateway_db &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL está pronto"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

cd ..

# Passo 3: Verificar backend
echo "3. Verificando Backend NestJS..."
if check_service "Backend" 3000; then
    # Testar health check
    echo "   Testando health check..."
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        echo -e "   ${GREEN}✓${NC} Health check OK"
    else
        echo -e "   ${YELLOW}!${NC} Health check não respondeu como esperado"
    fi
    
    # Testar Swagger
    echo "   Testando Swagger..."
    if curl -s http://localhost:3000/api-docs | grep -q "swagger"; then
        echo -e "   ${GREEN}✓${NC} Swagger disponível em http://localhost:3000/api-docs"
    else
        echo -e "   ${YELLOW}!${NC} Swagger não está acessível"
    fi
else
    echo -e "${YELLOW}!${NC} Backend não está rodando. Iniciando..."
    cd backend
    npm install
    npm run start:dev &
    cd ..
    sleep 10
fi
echo ""

# Passo 4: Verificar frontend
echo "4. Verificando Frontend Angular..."
if check_service "Frontend" 4200; then
    echo -e "   ${GREEN}✓${NC} Frontend disponível em http://localhost:4200"
else
    echo -e "${YELLOW}!${NC} Frontend não está rodando. Iniciando..."
    cd frontend
    npm install
    npm run start &
    cd ..
    sleep 15
fi
echo ""

# Passo 5: Testar APIs principais
echo "5. Testando APIs principais..."

# Testar listagem de configurações
echo "   Testando GET /api/gateway/configs..."
response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/gateway/configs)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} API de listagem funcionando"
else
    echo -e "   ${RED}✗${NC} API de listagem retornou código $http_code"
fi

# Criar uma configuração de teste
echo "   Testando POST /api/gateway/configs..."
config_response=$(curl -s -X POST http://localhost:3000/api/gateway/configs \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test API Gateway",
        "version": "1.0.0",
        "description": "Test configuration",
        "openapiVersion": "3.0.0"
    }')

if echo "$config_response" | grep -q '"id"'; then
    echo -e "   ${GREEN}✓${NC} Criação de configuração funcionando"
    config_id=$(echo "$config_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "   Config ID criado: $config_id"
    
    # Testar endpoint de detalhes
    echo "   Testando GET /api/gateway/configs/$config_id..."
    detail_response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/gateway/configs/$config_id)
    detail_code=$(echo "$detail_response" | tail -n1)
    if [ "$detail_code" = "200" ]; then
        echo -e "   ${GREEN}✓${NC} API de detalhes funcionando"
    else
        echo -e "   ${RED}✗${NC} API de detalhes retornou código $detail_code"
    fi
else
    echo -e "   ${RED}✗${NC} Falha ao criar configuração"
fi
echo ""

# Passo 6: Resumo
echo "========================================"
echo "📊 RESUMO DO TESTE"
echo "========================================"

all_good=true

if check_service "PostgreSQL" 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL: OK"
else
    echo -e "${RED}✗${NC} PostgreSQL: FALHOU"
    all_good=false
fi

if check_service "Backend" 3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend: OK (http://localhost:3000)"
    echo "    Swagger: http://localhost:3000/api-docs"
else
    echo -e "${RED}✗${NC} Backend: FALHOU"
    all_good=false
fi

if check_service "Frontend" 4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend: OK (http://localhost:4200)"
else
    echo -e "${RED}✗${NC} Frontend: FALHOU"
    all_good=false
fi

echo ""
if $all_good; then
    echo -e "${GREEN}✅ Todos os serviços estão funcionando!${NC}"
    echo ""
    echo "Você pode acessar:"
    echo "  - Frontend: http://localhost:4200"
    echo "  - API Docs: http://localhost:3000/api-docs"
    echo "  - Backend: http://localhost:3000"
else
    echo -e "${RED}❌ Alguns serviços falharam. Verifique os logs.${NC}"
    echo ""
    echo "Para ver logs:"
    echo "  - Docker: docker-compose -f infra-local/docker-compose.yml logs"
    echo "  - Backend: Ver console onde npm run start:dev está rodando"
    echo "  - Frontend: Ver console onde npm run start está rodando"
fi

echo ""
echo "Para parar todos os serviços:"
echo "  docker-compose -f infra-local/docker-compose.yml down"
echo ""