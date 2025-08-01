import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerConfig } from './config/swagger.config';
import * as bodyParser from 'body-parser';
import { SecretService } from './modules/aws/aws-secrets.service';
import * as compression from 'compression';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

dotenv.config();

async function bootstrap() {
    const httpsOptions = {
        key: fs.readFileSync('./ssl/private.key'),
        cert: fs.readFileSync('./ssl/fullchain.pem'),
        // ca: fs.readFileSync('./ssl/STAR_acumengroup_in.ca-bundle'),
        
    };
    const server = express();
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
    );
    app.getHttpAdapter().getInstance().disable('x-powered-by');
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    app.setGlobalPrefix('/backend');
    SwaggerConfig(app, '');
    app.enableCors({
        origin: '*',
        methods: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        allowedHeaders: 'Content-Type, Authorization, x-user-info',
    });
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(compression());

    // Get the SecretService from the application context
    await app.init();
    http.createServer(server).listen(3010);
    https.createServer(httpsOptions, server).listen(3012);
}

bootstrap();