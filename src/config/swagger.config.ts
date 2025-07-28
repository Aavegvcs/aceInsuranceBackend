import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
/**
 * Setup swagger in the application
 * @param app {INestApplication}
 */
export const SwaggerConfig = (app: INestApplication, apiVersion: string) => {
    const options = new DocumentBuilder()
        .setTitle('Rest Api')
        .setDescription('Rest Api Documentation ')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT Token',
                in: 'header'
            },
            'JWT-auth'
        )
        .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('apidata', app, document);
};
