import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './common/utils/cors-origins.util';
import { isSwaggerEnabled } from './common/utils/swagger.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });

  // Usar el logger estructurado (nestjs-pino) para todos los logs de NestJS
  app.useLogger(app.get(Logger));

  // Swagger solo en desarrollo, salvo SWAGGER_ENABLED=true (ver swagger.util):
  // fuera de desarrollo publicaría el mapa completo de un API expuesto a internet.
  const swaggerEnabled = isSwaggerEnabled();
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Backoffice API')
      .setDescription('API REST del backoffice')
      .setVersion('1.0')
      .addTag('backoffice')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const options: SwaggerDocumentOptions = {
      operationIdFactory: (
        controllerKey: string,
        methodKey: string
      ) => methodKey
    };
    const documentFactory = () => SwaggerModule.createDocument(app, config, options);
    SwaggerModule.setup('api', app, documentFactory);
  }

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Prefijo global para la API — excluye /health para que sea accesible sin prefijo
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // CORS — los orígenes salen de CORS_ORIGINS o FRONTEND_URL (ver cors-origins.util)
  const allowedOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`❤️  Health check available at: http://localhost:${port}/health`);
  if (swaggerEnabled) {
    logger.log(`📚 Swagger disponible en: http://localhost:${port}/api`);
  }
  if (allowedOrigins.length) {
    logger.log(`🌐 CORS habilitado para: ${allowedOrigins.join(', ')}`);
  } else {
    logger.error('CORS sin orígenes: define FRONTEND_URL o CORS_ORIGINS o el frontend no podrá llamar al API');
  }
}

bootstrap();
