import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { GatewayModule } from '../gateway/gateway.module';
import { EndpointsModule } from '../endpoints/endpoints.module';
import {
  GatewayConfig,
  GatewayEndpoint,
  ImportHistory,
} from '../../shared/entities';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([GatewayConfig, GatewayEndpoint, ImportHistory]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get('UPLOAD_DEST', './uploads'),
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
          },
        }),
        limits: {
          fileSize: configService.get('UPLOAD_MAX_SIZE', 104857600), // 100MB default
        },
        fileFilter: (req, file, cb) => {
          const allowedExtensions = ['.zip', '.yaml', '.yml', '.json'];
          const ext = extname(file.originalname).toLowerCase();
          if (allowedExtensions.includes(ext)) {
            cb(null, true);
          } else {
            cb(new Error('Only ZIP, YAML, and JSON files are allowed'), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
    GatewayModule,
    EndpointsModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}