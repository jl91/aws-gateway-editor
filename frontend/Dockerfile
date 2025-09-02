# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments
ARG API_URL=http://localhost:3000

# Set environment for build
ENV API_URL=$API_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist/aws-api-gateway-editor /usr/share/nginx/html

# Create config.js for runtime configuration
RUN echo "window._env_ = {};" > /usr/share/nginx/html/config.js

# Add healthcheck endpoint
RUN echo "OK" > /usr/share/nginx/html/health

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]