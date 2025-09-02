import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:4200'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle(configService.get('SWAGGER_TITLE', 'API Gateway Editor'))
    .setDescription(
      configService.get(
        'SWAGGER_DESCRIPTION',
        'API for managing API Gateway configurations',
      ),
    )
    .setVersion(configService.get('SWAGGER_VERSION', '1.0.0'))
    .addTag('Gateway Configurations')
    .addTag('Endpoints')
    .addTag('Import')
    .addTag('Export')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(
    configService.get('SWAGGER_PATH', 'api-docs'),
    app,
    document,
  );

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation: http://localhost:${port}/${configService.get('SWAGGER_PATH', 'api-docs')}`,
  );
}

bootstrap();