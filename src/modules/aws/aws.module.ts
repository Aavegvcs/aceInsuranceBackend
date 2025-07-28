import { Global, Module } from '@nestjs/common';
import { SecretService } from './aws-secrets.service';
import { AwsController } from './aws.controller';
import { AwsService } from './aws.service';

@Global()
@Module({
    controllers: [AwsController],
    providers: [SecretService, AwsService],
    exports: [SecretService, AwsService]
})
export class AwsModule {}
