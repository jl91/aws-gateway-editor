import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ImportModule } from './modules/import/import.module';
import { ExportModule } from './modules/export/export.module';
import { EndpointsModule } from './modules/endpoints/endpoints.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    DatabaseModule,
    GatewayModule,
    ImportModule,
    ExportModule,
    EndpointsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}