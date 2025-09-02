#!/bin/bash

# Database restore script for Gateway Editor
# Usage: ./restore.sh <backup_file>

set -e

# Load environment variables
source ../.env 2>/dev/null || source ../.env.example

# Configuration
BACKUP_DIR="./backup"
CONTAINER_NAME="gateway-postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -la "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo "  No backups found in ${BACKUP_DIR}/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try to find it in the backup directory
    if [ -f "${BACKUP_DIR}/$BACKUP_FILE" ]; then
        BACKUP_FILE="${BACKUP_DIR}/$BACKUP_FILE"
    elif [ -f "${BACKUP_DIR}/${BACKUP_FILE}.sql.gz" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}.sql.gz"
    else
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Preparing to restore from: ${BACKUP_FILE}${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the container with: docker-compose up -d postgres"
    exit 1
fi

# Confirmation prompt
echo -e "${RED}WARNING: This will replace all current data in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Extracting compressed backup..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/restore.sql"
    RESTORE_FILE="$TEMP_DIR/restore.sql"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Perform restore
echo -e "${YELLOW}Restoring database...${NC}"
docker exec -i ${CONTAINER_NAME} psql \
    -U ${DB_USER:-gateway_user} \
    -d ${DB_NAME:-gateway_db} \
    < "$RESTORE_FILE"

echo -e "${GREEN}✓ Database restored successfully!${NC}"

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(docker exec ${CONTAINER_NAME} psql \
    -U ${DB_USER:-gateway_user} \
    -d ${DB_NAME:-gateway_db} \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

echo "  Tables in database: ${TABLE_COUNT// /}"

echo -e "${GREEN}Done!${NC}"