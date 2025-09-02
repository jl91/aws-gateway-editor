import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { GatewayConfig } from './gateway-config.entity';

@Entity('gateway_endpoints')
@Unique('unique_endpoint_per_config', ['config', 'method', 'path'])
@Index('idx_gateway_endpoints_config', ['config'])
@Index('idx_gateway_endpoints_order', ['config', 'sequenceOrder'])
@Index('idx_gateway_endpoints_operation', ['operationId'])
export class GatewayEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GatewayConfig, (config) => config.endpoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'config_id' })
  config: GatewayConfig;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 500 })
  path: string;

  @Column({ name: 'operation_id', length: 255, nullable: true })
  operationId: string;

  @Column({ length: 500, nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({ name: 'target_url', type: 'text', nullable: true })
  targetUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, any>;

  @Column({ name: 'query_params', type: 'jsonb', nullable: true })
  queryParams: Record<string, any>;

  @Column({ name: 'path_params', type: 'jsonb', nullable: true })
  pathParams: Record<string, any>;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  responses: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  security: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  authentication: Record<string, any>;

  @Column({ name: 'rate_limiting', type: 'jsonb', nullable: true })
  rateLimiting: Record<string, any>;

  @Column({ name: 'cache_config', type: 'jsonb', nullable: true })
  cacheConfig: Record<string, any>;

  @Column({ name: 'cors_config', type: 'jsonb', nullable: true })
  corsConfig: Record<string, any>;

  @Column({ name: 'integration_type', length: 50, nullable: true })
  integrationType: string;

  @Column({ name: 'integration_config', type: 'jsonb', nullable: true })
  integrationConfig: Record<string, any>;

  @Column({ name: 'x_extensions', type: 'jsonb', nullable: true })
  xExtensions: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}