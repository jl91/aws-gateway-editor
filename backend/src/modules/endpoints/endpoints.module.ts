import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';
import { GatewayEndpoint, GatewayConfig } from '../../shared/entities';

@Module({
  imports: [TypeOrmModule.forFeature([GatewayEndpoint, GatewayConfig])],
  controllers: [EndpointsController],
  providers: [EndpointsService],
  exports: [EndpointsService],
})
export class EndpointsModule {}