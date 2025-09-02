import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GatewayEndpoint } from './gateway-endpoint.entity';

@Entity('gateway_configs')
@Index('idx_gateway_configs_active', ['isActive'])
@Index('idx_gateway_configs_hash', ['fileHash'])
export class GatewayConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'file_hash', length: 64, unique: true, nullable: true })
  fileHash: string;

  @Column({ name: 'openapi_version', length: 10, default: '3.0.0' })
  openapiVersion: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => GatewayEndpoint, (endpoint) => endpoint.config, {
    cascade: true,
  })
  endpoints: GatewayEndpoint[];
}