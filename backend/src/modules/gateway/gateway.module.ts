import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { GatewayConfig, GatewayEndpoint } from '../../shared/entities';

@Module({
  imports: [TypeOrmModule.forFeature([GatewayConfig, GatewayEndpoint])],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}