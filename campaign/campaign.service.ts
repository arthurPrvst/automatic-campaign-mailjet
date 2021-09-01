import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailerService } from '../../shared/mailer/mailer.service';
import { UsersService } from '../../api/users/users.service';
import { MatchLogsService } from '../../api/tracking/match-logs/match-logs.service';
import { MatchsService } from '../../api/matchs/matchs.service';
import { UsersCompatibilitiesService } from '../../api/users-compatibilities/users-compatibilites.service';
import { CreateCampaignDraft } from '../../shared/mailer/resources/create-campaign-draft-creation'
import { UpdateCampaignDraft } from '../../shared/mailer/resources/update-campaign-draft-creation'
import { CampaignTemplate } from '../../shared/mailer/resources/campaign-templates.enum'
import { ContactProperties } from '../../shared/mailer/resources/contact-properties.enum'
import { Segment } from '../../shared/mailer/resources/segments.enum'


// ISSUE IF THE BACK NEEDS TO SCALE
// SEE HERE TO SOLVE THIS ISSUE WITHOUT HAVING A SEPARATED SERVER
// https://gist.github.com/kixorz/5209217
@Injectable()
export class CampaignService {

    constructor(private mailService: MailerService,
                private usersService: UsersService,
                private matchServiceLog: MatchLogsService,
                private matchService: MatchsService,
                private usersCompatibilitiesService: UsersCompatibilitiesService) { }

    async getAllCampaignDrafts(): Promise<any> {
        return await this.mailService.getAllCampaignDrafts();
    }

    async cancelSchedulingDraftCampaign(draftCampaignId: number): Promise<any> {
        return await this.mailService.cancelScheduleCampaign(draftCampaignId);
    }

    async getSegmentIdByName(segmentName: string): Promise<number> {
        const segments = await this.mailService.getAllSegments();
        const segmentId = segments.body.Data.filter(s => s.Name == segmentName).map(s => s.ID)[0];
        console.log("SegmentID for " + segmentName + " is " + segmentId);
        return segmentId;
    }

    async generateCampaign(draftCampaign: CreateCampaignDraft, delayBeforeSendMinutes: number) {
        const campaignDraft = await this.mailService.createCampaignDraft(draftCampaign);
        const campaignDraftID = campaignDraft.body.Data[0].ID;
        console.log("CampaignDraft (" + draftCampaign.campaignName + ") created with campaignID =", campaignDraftID);

        // Set the contents
        const templateDetailContent = await this.mailService.getTemplateContentDetail(draftCampaign.templateId);

        const content = new UpdateCampaignDraft();
        content.campaignDraftId = campaignDraftID;
        content.headers = templateDetailContent.body.Data[0]["Headers"];
        content.htmlPart = templateDetailContent.body.Data[0]["Html-part"];
        content.mjmlContent = templateDetailContent.body.Data[0]["MJMLContent"];
        content.textPart = templateDetailContent.body.Data[0]["Text-part"];
        
        const updateCampaignDraft = await this.mailService.createCampaignDraftContent(content);

        // Send a test mail
        await this.mailService.sendTestMail(campaignDraftID);

        // Set the schedule
        let sendSchedule = new Date();
        sendSchedule.setMinutes(sendSchedule.getMinutes() + delayBeforeSendMinutes);
        sendSchedule = new Date(sendSchedule);
        await this.mailService.scheduleCampaign(campaignDraftID, sendSchedule);
    }

    // Chaque friday at 6pm05
    @Cron('0 5 18 * * 5', {
        name: 'sendMarketingCampaignVerifyAccount',
        timeZone: 'Europe/Paris',
    })
    async sendMarketingCampaignVerifyAccount() {
        console.log("Cronjob sendMarketingCampaignVerifyAccount triggered...");

        // Get all users where we can send a proposition
        const matchs = await this.matchService.findAllProposed();
        const filteredStatus = [""]
        const filteredMatchs = [];

        // Update their metadatas
        for (let match of matchs) {
            const userAContactId = match.userCompatibility.userA.contactId
            const userBContactId = match.userCompatibility.userB.contactId

            const forbiddenLogs = match.matchLogs.filter(ml => ml.status != "proposed");
            if (forbiddenLogs.length == 0) {                
                const userAHash = match.userCompatibility.hashUserA;
                const userBHash = match.userCompatibility.hashUserB;

                await this.mailService.updateContactMetadata(userAContactId, ContactProperties.HAS_PROPOSED_MATCH, true);
                await this.mailService.updateContactMetadata(userAContactId, ContactProperties.PROPOSED_MATCH_HASH, userAHash);
                await this.mailService.updateContactMetadata(userBContactId, ContactProperties.HAS_PROPOSED_MATCH, true);
                await this.mailService.updateContactMetadata(userBContactId, ContactProperties.PROPOSED_MATCH_HASH, userBHash);

                filteredMatchs.push(match);
            } else {
                console.warn("Match proposition " + match.id + " discarded ! THIS SHOULD NOT OCCURS");
                console.warn("WILL RESET HAS_PROPOSED_MATCH (they won't be triggered by the campaign) to false for contactsIds=" + userAContactId + ", " +  userBContactId + " ! ");
                await this.mailService.updateContactMetadata(userAContactId, ContactProperties.HAS_PROPOSED_MATCH, false);
                await this.mailService.updateContactMetadata(userBContactId, ContactProperties.HAS_PROPOSED_MATCH, false);
            }
        }

        // Create the campaign
        const segmentId = await this.getSegmentIdByName(Segment.MATCH_FOUND);
        const draft = new CreateCampaignDraft();
        draft.campaignName = "Match found";
        draft.campaignTitle = `${process.env.ENV} | Match found (${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')})`;
        draft.campaignSubject = "Les recherches de Sara de cette semaine";
        draft.mailSubject = "Les recherches de Sara de cette semaine";
        draft.segmentId = segmentId;
        draft.templateId = CampaignTemplate.ACCOUNT_VERIFICATION_TEMPLATE;

        await this.generateCampaign(draft, 30);
    }

}