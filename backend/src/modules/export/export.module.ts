import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { GatewayModule } from '../gateway/gateway.module';
import { EndpointsModule } from '../endpoints/endpoints.module';
import {
  GatewayConfig,
  GatewayEndpoint,
  ExportCache,
} from '../../shared/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([GatewayConfig, GatewayEndpoint, ExportCache]),
    GatewayModule,
    EndpointsModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}