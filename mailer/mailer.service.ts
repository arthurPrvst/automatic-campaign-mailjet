import { Injectable } from '@nestjs/common';
import * as mailjet from 'node-mailjet';
import { TransactionalTemplate } from './resources/transactional-templates.enum';
import { ContactProperties } from './resources/contact-properties.enum';
import { ConfigService } from '../config/config.service';
import { User } from '../../api/users/interfaces/user.interface';
import { CreateCampaignDraft } from '../../shared/mailer/resources/create-campaign-draft-creation'
import { UpdateCampaignDraft } from '../../shared/mailer/resources/update-campaign-draft-creation'


@Injectable()
export class MailerService {
  private contactListID : number;
  private mailjet: mailjet.Email.Client;

  constructor(private config: ConfigService) {
    this.contactListID = this.config.environment.mailjet.contactListID;
    this.mailjet = mailjet.connect(
      this.config.environment.mailjet.apiKey,
      this.config.environment.mailjet.secretKey,
    );
  }

  async getAllCampaignDrafts(): Promise<any> {
    return await this.mailjet
        .get("campaigndraft", {'version': 'v3'})
        .request()
  }

  async sendMail(
    to: string | string[],
    template: TransactionalTemplate,
    variables: Record<string, string | any[]>,
    options: Record<string, any> = {},
  ) {
    let recipients = Array.isArray(to) ? to : [to];
    console.log('[MAIL SENT] MAIL TO ', to);
    console.log('[MAIL SENT] TEMPLATE ', template);
    console.log('[MAIL SENT] variables', JSON.stringify(variables));
    return await this.mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            To: recipients.map(email => ({ Email: email })),
            TemplateID: parseInt(template as any),
            TemplateLanguage: true,
            Variables: variables,
            ...options,
          },
        ],
    });
  }

  async createContact(user: User): Promise<any> {
    return await this.mailjet
    .post("contact", {'version': 'v3'})
    .request({
        "IsExcludedFromCampaigns": "false",
        "Name": user.firstname,
        "Email": user.email
      });
  }

  async addContactToContactList(contactId: number) {
    return await this.mailjet
      .post("listrecipient", {'version': 'v3'})
      .request({
          "IsUnsubscribed": "false",
          "ContactID": contactId,
          "ListID": this.contactListID,
        });
  }

  async updateContactMetadata(contactId: number, metadataName : ContactProperties, metadataValue: any) {
    if (contactId === null || contactId === 0) {
      console.warn("Wont update, contactId =", contactId);
      return
    }

    console.log("Will set " + metadataName + "=" + metadataValue + " for contactId=" + contactId);

    return await this.mailjet
      .put("contactdata", {'version': 'v3'})
      .id(contactId)
      .request({
          "Data":[
            {
              "Name": metadataName,
              "Value": metadataValue
            }
          ]
        })
  }

  async getAllSegments(): Promise<any> {
    console.log("Will retrieve segments...");

    return await this.mailjet
    .get("contactfilter", {'version': 'v3'})
    .request();
  }

  async createCampaignDraft(campaignDraft: CreateCampaignDraft): Promise<any> {
    console.log("Will create campaignDraft " + campaignDraft.campaignName + " on segmentID=" + campaignDraft.segmentId);

    return await this.mailjet
      .post("campaigndraft", {'version': 'v3'})
      .request({
        "Locale": "fr_FR",
        "Sender": "Inès de LifePartner",
        "SenderName": "Inès de LifePartner",
        "SenderEmail": "ines@life-partner.co",
        "Subject": campaignDraft.campaignSubject,
        "ContactsListID": this.contactListID, //Depends on the ENV !!!
        "SegmentationID": campaignDraft.segmentId,
        "TemplateID": campaignDraft.templateId,
        "Title": campaignDraft.campaignTitle,
        "EditMode": "html2",
      });
  }
 
  async getTemplateContentDetail(templateId: number): Promise<any> {
    console.log("Will retrieve templateContent of templateID=", templateId);

    return await this.mailjet
    .get("template", {'version': 'v3'})
    .id(templateId)
    .action("detailcontent")
    .request()
  }

  async createCampaignDraftContent(updateCampaignDraft: UpdateCampaignDraft): Promise<any> {
    console.log("Creating campaign content for campaignId =", updateCampaignDraft.campaignDraftId);

    return await this.mailjet
    .post("campaigndraft", {'version': 'v3'})
    .id(updateCampaignDraft.campaignDraftId)
    .action("detailcontent")
    .request({
        "Headers": updateCampaignDraft.headers,
        "Html-part": updateCampaignDraft.htmlPart,
        "MJMLContent": updateCampaignDraft.mjmlContent,
        "Text-part": updateCampaignDraft.textPart,
      })
  }

  async sendTestMail(campaignDraftId: number): Promise<any> {
    console.log("Sending test mail for campaignId =", campaignDraftId);

    return await this.mailjet
    .post("campaigndraft", {'version': 'v3'})
    .id(campaignDraftId)
    .action("test")
    .request({
        "Recipients":[
          {
            "Email": "parthur61@gmail.com",
            "Name": "Arthur"
          }
        ]
      })
  }

  async scheduleCampaign(campaignDraftId: number, schedule: Date): Promise<any> {
    console.log("Will schedule campaignId=" + campaignDraftId + " to be send the " + schedule);

    return this.mailjet
    .post("campaigndraft", {'version': 'v3'})
    .id(campaignDraftId)
    .action("schedule")
    .request({
        "Date": schedule
      })
  }

  async cancelScheduleCampaign(campaignDraftId: number): Promise<any> {
    console.log("Cancelling scheduling of campaignId =", campaignDraftId);

    return this.mailjet
    .delete("campaigndraft", {'version': 'v3'})
    .id(campaignDraftId)
    .action("schedule")
    .request()
  }

}
