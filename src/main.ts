/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@bull-board/express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Wallet Simulation API')
    .setDescription('Basic API for simulating wallet operations')
    .setVersion('1.0')
    .addTag('wallet')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const serverAdapter = app.get<ExpressAdapter>('BULL_BOARD_ADAPTER');

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
