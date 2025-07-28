import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useValue: redisClient,
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
