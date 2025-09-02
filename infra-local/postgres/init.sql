-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create gateway_configs table
CREATE TABLE IF NOT EXISTS gateway_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    file_hash VARCHAR(64) UNIQUE,
    openapi_version VARCHAR(10) DEFAULT '3.0.0',
    is_active BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create gateway_endpoints table with sequence_order for preserving order
CREATE TABLE IF NOT EXISTS gateway_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES gateway_configs(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    operation_id VARCHAR(255),
    summary VARCHAR(500),
    description TEXT,
    tags TEXT[],
    target_url TEXT,
    headers JSONB,
    query_params JSONB,
    path_params JSONB,
    request_body JSONB,
    responses JSONB,
    security JSONB,
    authentication JSONB,
    rate_limiting JSONB,
    cache_config JSONB,
    cors_config JSONB,
    integration_type VARCHAR(50), -- Lambda, HTTP, Mock, StepFunction
    integration_config JSONB,
    x_extensions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(config_id, sequence_order),
    CONSTRAINT unique_endpoint_per_config UNIQUE(config_id, method, path)
);

-- Create import_history table
CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES gateway_configs(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(50),
    import_status VARCHAR(50) NOT NULL, -- pending, processing, success, failed
    error_details TEXT,
    endpoints_count INTEGER,
    processing_time_ms INTEGER,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by VARCHAR(255)
);

-- Create export_cache table
CREATE TABLE IF NOT EXISTS export_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES gateway_configs(id) ON DELETE CASCADE,
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    file_format VARCHAR(10) NOT NULL, -- json, yaml
    file_content BYTEA,
    file_size BIGINT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- gateway_config, gateway_endpoint
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, activate, deactivate
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_gateway_configs_active ON gateway_configs(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_configs_hash ON gateway_configs(file_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_configs_created ON gateway_configs(created_at DESC);

CREATE INDEX idx_gateway_endpoints_config ON gateway_endpoints(config_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_endpoints_order ON gateway_endpoints(config_id, sequence_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_endpoints_method_path ON gateway_endpoints(config_id, method, path) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_endpoints_operation ON gateway_endpoints(operation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gateway_endpoints_tags ON gateway_endpoints USING GIN(tags) WHERE deleted_at IS NULL;

CREATE INDEX idx_import_history_config ON import_history(config_id);
CREATE INDEX idx_import_history_status ON import_history(import_status);
CREATE INDEX idx_import_history_date ON import_history(imported_at DESC);

CREATE INDEX idx_export_cache_config ON export_cache(config_id);
CREATE INDEX idx_export_cache_hash ON export_cache(file_hash);
CREATE INDEX idx_export_cache_expires ON export_cache(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_gateway_configs_updated_at BEFORE UPDATE
    ON gateway_configs FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gateway_endpoints_updated_at BEFORE UPDATE
    ON gateway_endpoints FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create view for active configurations
CREATE OR REPLACE VIEW active_gateway_configs AS
SELECT * FROM gateway_configs
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Create view for active endpoints with config info
CREATE OR REPLACE VIEW active_gateway_endpoints AS
SELECT 
    e.*,
    c.name as config_name,
    c.version as config_version,
    c.is_active as config_is_active
FROM gateway_endpoints e
JOIN gateway_configs c ON e.config_id = c.id
WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL
ORDER BY e.config_id, e.sequence_order;

-- Create function to reorder endpoints
CREATE OR REPLACE FUNCTION reorder_endpoints(
    p_config_id UUID,
    p_endpoint_ids UUID[]
) RETURNS VOID AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(p_endpoint_ids, 1) LOOP
        UPDATE gateway_endpoints
        SET sequence_order = i * 10
        WHERE id = p_endpoint_ids[i] AND config_id = p_config_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next sequence order
CREATE OR REPLACE FUNCTION get_next_sequence_order(p_config_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_order INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_order), 0) INTO max_order
    FROM gateway_endpoints
    WHERE config_id = p_config_id AND deleted_at IS NULL;
    
    RETURN max_order + 10;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for development (optional)
-- Uncomment if you want sample data
/*
INSERT INTO gateway_configs (name, version, description, openapi_version) VALUES
('Sample API Gateway', '1.0.0', 'Sample configuration for development', '3.0.0');

INSERT INTO gateway_endpoints (
    config_id,
    sequence_order,
    method,
    path,
    operation_id,
    summary,
    description,
    tags
)
SELECT 
    (SELECT id FROM gateway_configs LIMIT 1),
    10,
    'GET',
    '/health',
    'healthCheck',
    'Health Check',
    'Returns the health status of the API',
    ARRAY['system', 'monitoring']
;
*/

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gateway_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gateway_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gateway_user;