/* eslint-disable prettier/prettier */
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm'; // <-- Import TypeOrmModuleAsyncOptions and TypeOrmModuleOptions
import { SecretService } from 'src/modules/aws/aws-secrets.service';
import { AwsModule } from 'src/modules/aws/aws.module';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
    name: 'default',
    imports: [AwsModule], // Import the module that provides SecretService
    inject: [SecretService],
    useFactory: async (secretService: SecretService): Promise<TypeOrmModuleOptions> => {
        // Retrieve secrets using SecretService
        const dbHost = await secretService.getSecret('DB_HOST');
        const dbPort = parseInt(await secretService.getSecret('DB_PORT'));
        const dbUsername = await secretService.getSecret('DB_USERNAME');
        const dbPassword = await secretService.getSecret('DB_PASSWORD');
        const dbName = await secretService.getSecret('DB_DATABASE');

        return {
            type: 'mysql',
            host: dbHost,
            port: dbPort,
            username: dbUsername,
            password: dbPassword,
            database: dbName,
            entities: [__dirname + '/../**/*.entity.{js,ts}'],
            migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
            synchronize: true,
            logging: false,
            extra: {
                timezone: 'UTC',
                connectionLimit: 20,         // 🔼 Increase pool size from default (important!)
                connectTimeout: 10000,       // 10 sec to establish connection
                waitForConnections: true,    // wait if pool is full
                queueLimit: 0,               // unlimited waiting queue
            }
        };
    }
};
