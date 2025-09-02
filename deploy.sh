#!/bin/bash

# Deploy script for API Gateway Editor
# This script builds and deploys the application in production mode

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo -e "🚀 API Gateway Editor - Production Deploy"
echo -e "========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Load environment variables
if [ -f .env.production ]; then
    echo -e "${YELLOW}Loading production environment variables...${NC}"
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}✗ .env.production file not found${NC}"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Parse command line arguments
ACTION=${1:-deploy}
BACKUP=${2:-true}

case $ACTION in
    build)
        echo -e "${BLUE}Building production images...${NC}"
        docker-compose -f docker-compose.prod.yml build --no-cache
        echo -e "${GREEN}✓ Build completed${NC}"
        ;;
    
    deploy)
        # Backup database if requested
        if [ "$BACKUP" = "true" ] && [ "$(docker ps -q -f name=gateway-postgres)" ]; then
            echo -e "${YELLOW}Backing up database...${NC}"
            ./infra-local/postgres/backup.sh "pre-deploy-$(date +%Y%m%d-%H%M%S)"
            echo -e "${GREEN}✓ Backup completed${NC}"
        fi

        echo -e "${BLUE}Building production images...${NC}"
        docker-compose -f docker-compose.prod.yml build

        echo -e "${BLUE}Stopping existing containers...${NC}"
        docker-compose -f docker-compose.prod.yml down

        echo -e "${BLUE}Starting production containers...${NC}"
        docker-compose -f docker-compose.prod.yml up -d

        echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
        sleep 10

        # Check service health
        echo -e "${YELLOW}Checking service health...${NC}"
        
        if curl -f http://localhost:${BACKEND_PORT:-3000}/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend is healthy${NC}"
        else
            echo -e "${RED}✗ Backend health check failed${NC}"
            echo "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
        fi

        if curl -f http://localhost:${FRONTEND_PORT:-80}/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend is healthy${NC}"
        else
            echo -e "${RED}✗ Frontend health check failed${NC}"
            echo "Check logs: docker-compose -f docker-compose.prod.yml logs frontend"
        fi

        echo ""
        echo -e "${GREEN}✅ Deployment completed!${NC}"
        echo ""
        echo "Services available at:"
        echo "  - Frontend: http://localhost:${FRONTEND_PORT:-80}"
        echo "  - Backend API: http://localhost:${BACKEND_PORT:-3000}"
        echo "  - API Docs: http://localhost:${BACKEND_PORT:-3000}/api-docs"
        ;;
    
    stop)
        echo -e "${BLUE}Stopping production containers...${NC}"
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
    
    restart)
        echo -e "${BLUE}Restarting production containers...${NC}"
        docker-compose -f docker-compose.prod.yml restart
        echo -e "${GREEN}✓ Services restarted${NC}"
        ;;
    
    logs)
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            docker-compose -f docker-compose.prod.yml logs -f
        else
            docker-compose -f docker-compose.prod.yml logs -f $SERVICE
        fi
        ;;
    
    status)
        echo -e "${BLUE}Service Status:${NC}"
        docker-compose -f docker-compose.prod.yml ps
        ;;
    
    backup)
        echo -e "${BLUE}Creating database backup...${NC}"
        ./infra-local/postgres/backup.sh "manual-$(date +%Y%m%d-%H%M%S)"
        echo -e "${GREEN}✓ Backup completed${NC}"
        ;;
    
    restore)
        BACKUP_FILE=$2
        if [ -z "$BACKUP_FILE" ]; then
            echo -e "${RED}Please specify backup file${NC}"
            echo "Usage: $0 restore <backup-file>"
            exit 1
        fi
        echo -e "${BLUE}Restoring database from $BACKUP_FILE...${NC}"
        ./infra-local/postgres/restore.sh "$BACKUP_FILE"
        echo -e "${GREEN}✓ Restore completed${NC}"
        ;;
    
    update)
        echo -e "${BLUE}Updating application...${NC}"
        git pull origin main
        $0 build
        $0 deploy
        ;;
    
    clean)
        echo -e "${YELLOW}⚠️  This will remove all containers, volumes, and images${NC}"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy]es$ ]]; then
            docker-compose -f docker-compose.prod.yml down -v --rmi all
            echo -e "${GREEN}✓ Cleanup completed${NC}"
        else
            echo "Cleanup cancelled"
        fi
        ;;
    
    *)
        echo "Usage: $0 {build|deploy|stop|restart|logs|status|backup|restore|update|clean} [options]"
        echo ""
        echo "Commands:"
        echo "  build               Build production Docker images"
        echo "  deploy [no-backup]  Deploy the application (default: with backup)"
        echo "  stop                Stop all services"
        echo "  restart             Restart all services"
        echo "  logs [service]      View logs (optionally for specific service)"
        echo "  status              Show service status"
        echo "  backup              Create database backup"
        echo "  restore <file>      Restore database from backup"
        echo "  update              Pull latest code and redeploy"
        echo "  clean               Remove all containers, volumes, and images"
        exit 1
        ;;
esac