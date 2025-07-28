// secret.service.ts
import { Global, Injectable, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
@Global()
@Injectable()
export class SecretService implements OnModuleInit {
    private secrets: Record<string, string> = {
        DB_HOST: process.env.DB_HOST || '',
        DB_USERNAME: process.env.DB_USERNAME || '',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        DB_DATABASE: process.env.DB_DATABASE || '',
        DB_PORT: process.env.DB_PORT || '3306', // Default MySQL port
        APP_SECRET: process.env.APP_SECRET || '',
        APP_PORT: process.env.APP_PORT || '',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
        JWT_VERIFY_SECRET: process.env.JWT_VERIFY_SECRET || '',
        ENC_KEY: process.env.ENC_KEY || '',
        NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL || '',
        NODEMAILER_PASS: process.env.NODEMAILER_PASS || '',
        API_URL: process.env.API_URL || '',
        APP_URL: process.env.APP_URL || '',
        PEPIPOST_API_KEY: process.env.PEPIPOST_API_KEY || "",
    };
    async onModuleInit() {
        // await this.loadSecrets();
    }

    private async loadSecrets() {
        let secretName: string = null;

        if (process?.env?.ENVIRONMENT === 'stage') {
            secretName = 'product/stage/backend';
        } else if (process?.env?.ENVIRONMENT === 'sandbox') {
            secretName = 'product/stage/sandbox';
        } else {
            secretName = 'product/live/backend';
        }

        const client = new SecretsManagerClient({
            region: 'us-east-1'
        });

        try {
            const response = await client.send(
                new GetSecretValueCommand({
                    SecretId: secretName,
                    VersionStage: 'AWSCURRENT' // VersionStage defaults to AWSCURRENT if unspecified
                })
            );

            this.secrets = JSON.parse(response.SecretString || '{}');
        } catch (error) {
            // Handle errors appropriately
            throw error;
        }
    }

    // async getSecret(key?: string) {
    //   if (!this.secrets) {
    //     await this.onModuleInit();
    //   }

    //   return key ? this.secrets[key] : {...this.secrets}
    // }

    async getSecret(): Promise<Record<string, string>>;
    async getSecret(key: string): Promise<string>;
    async getSecret(key?: string): Promise<string | Record<string, string>> {
        return key ? this.secrets[key] || '' : { ...this.secrets };
    }
}
