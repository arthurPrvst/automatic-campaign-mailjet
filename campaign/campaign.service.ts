import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailerService } from '../../shared/mailer/mailer.service';
import { CreateCampaignDraft } from '../../shared/mailer/resources/create-campaign-draft-creation'
import { UpdateCampaignDraft } from '../../shared/mailer/resources/update-campaign-draft-creation'
import { CampaignTemplate } from '../../shared/mailer/resources/campaign-templates.enum'
import { Segment } from '../../shared/mailer/resources/segments.enum'


// ISSUE IF THE BACK NEEDS TO SCALE
// SEE HERE TO SOLVE THIS ISSUE WITHOUT HAVING A SEPARATED SERVER
// https://gist.github.com/kixorz/5209217
@Injectable()
export class CampaignService {

    constructor(private mailService: MailerService) { }

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
        const segmentId = await this.getSegmentIdByName(Segment.SURVEY_NOT_FINISHED);

        const draft = new CreateCampaignDraft();
        draft.campaignName = "Account not verified";
        draft.campaignTitle = `Account not verified (${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')})`;
        draft.campaignSubject = "Verify your account";
        draft.mailSubject = "Verify your account";
        draft.segmentId = segmentId;
        draft.templateId = CampaignTemplate.QUESTIONAIRE_PAS_FINI;

        await this.generateCampaign(draft, 30);
    }

}