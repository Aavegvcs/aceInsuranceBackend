import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { AwsModule } from 'src/modules/aws/aws.module';
import { SecretService } from 'src/modules/aws/aws-secrets.service';

export const jwtConfig: JwtModuleAsyncOptions = {
    imports: [AwsModule], // Import the module that provides SecretService
    inject: [SecretService],
    useFactory: async (secretService: SecretService) => {
        const secret = await secretService.getSecret('APP_SECRET');
        return {
            secret: secret,
            signOptions: { expiresIn: '1h' }
        };
    }
};
