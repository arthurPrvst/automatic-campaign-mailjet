import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { MailerModule } from '../../shared/mailer/mailer.module';
import { UsersCompatibilitiesModule } from '../../api/users-compatibilities/users-compatibilites.module';
import { UsersModule } from '../../api/users/users.module';
import { MatchLogsModule } from '../../api/tracking/match-logs/match-logs.module';
import { MatchsModule } from '../../api/matchs/matchs.module';

@Module({
    imports: [
        MailerModule,
        UsersModule,
        MatchsModule,
        MatchLogsModule,
        UsersCompatibilitiesModule
    ],
    providers: [
        CampaignService
    ],
    exports: [
        CampaignService
    ],
})
export class CampaignModule { }
