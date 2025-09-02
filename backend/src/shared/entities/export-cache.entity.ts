import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GatewayConfig } from './gateway-config.entity';

export enum ExportFormat {
  JSON = 'json',
  YAML = 'yaml',
}

@Entity('export_cache')
@Index('idx_export_cache_config', ['config'])
@Index('idx_export_cache_hash', ['fileHash'])
@Index('idx_export_cache_expires', ['expiresAt'])
export class ExportCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GatewayConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_id' })
  config: GatewayConfig;

  @Column({ name: 'file_hash', length: 64, unique: true })
  fileHash: string;

  @Column({
    name: 'file_format',
    type: 'enum',
    enum: ExportFormat,
  })
  fileFormat: ExportFormat;

  @Column({ name: 'file_content', type: 'bytea', nullable: true })
  fileContent: Buffer;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'accessed_count', type: 'integer', default: 0 })
  accessedCount: number;

  @Column({ name: 'last_accessed_at', type: 'timestamp', nullable: true })
  lastAccessedAt: Date;
}