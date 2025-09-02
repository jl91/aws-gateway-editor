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

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('import_history')
@Index('idx_import_history_config', ['config'])
@Index('idx_import_history_status', ['importStatus'])
@Index('idx_import_history_date', ['importedAt'])
export class ImportHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GatewayConfig, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'config_id' })
  config: GatewayConfig;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'file_type', length: 50, nullable: true })
  fileType: string;

  @Column({
    name: 'import_status',
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING,
  })
  importStatus: ImportStatus;

  @Column({ name: 'error_details', type: 'text', nullable: true })
  errorDetails: string;

  @Column({ name: 'endpoints_count', type: 'integer', nullable: true })
  endpointsCount: number;

  @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
  processingTimeMs: number;

  @CreateDateColumn({ name: 'imported_at' })
  importedAt: Date;

  @Column({ name: 'imported_by', length: 255, nullable: true })
  importedBy: string;
}