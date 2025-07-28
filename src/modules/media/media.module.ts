import { Module, forwardRef } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ReferenceModule } from '../reference/reference.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { UserModule } from '../user/user.module';

@Module({
    imports: [forwardRef(() => UserModule), ReferenceModule, TypeOrmModule.forFeature([Media])],
    controllers: [MediaController],
    providers: [
        MediaService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerModule
        }
    ],
    exports: [MediaService]
})
export class MediaModule {}
