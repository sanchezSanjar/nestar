import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../nestar-api/src/database/database.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
	imports: [ConfigModule.forRoot(), DatabaseModule, ScheduleModule.forRoot()],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}