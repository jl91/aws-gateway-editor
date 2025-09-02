#!/bin/bash

# Database backup script for Gateway Editor
# Usage: ./backup.sh [backup_name]

set -e

# Load environment variables
source ../.env 2>/dev/null || source ../.env.example

# Configuration
BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"gateway_backup_${TIMESTAMP}"}
CONTAINER_NAME="gateway-postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting database backup...${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the container with: docker-compose up -d postgres"
    exit 1
fi

# Perform backup
echo "Creating backup: ${BACKUP_NAME}.sql"
docker exec -t ${CONTAINER_NAME} pg_dump \
    -U ${DB_USER:-gateway_user} \
    -d ${DB_NAME:-gateway_db} \
    --no-owner \
    --no-privileges \
    --if-exists \
    --clean \
    --verbose \
    > "${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Compress the backup
echo "Compressing backup..."
gzip -9 "${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Get file size
FILESIZE=$(ls -lh "${BACKUP_DIR}/${BACKUP_NAME}.sql.gz" | awk '{print $5}')

echo -e "${GREEN}✓ Backup completed successfully!${NC}"
echo "  File: ${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
echo "  Size: ${FILESIZE}"

# Keep only last 10 backups (optional)
echo "Cleaning old backups (keeping last 10)..."
ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm

echo -e "${GREEN}Done!${NC}"