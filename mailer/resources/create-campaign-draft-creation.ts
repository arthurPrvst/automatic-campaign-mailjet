import { IsNotEmpty } from 'class-validator';

export class CreateCampaignDraft {
  @IsNotEmpty()
  campaignName: string;
  
  @IsNotEmpty()
  campaignSubject: string;

  @IsNotEmpty()
  campaignTitle: string;

  @IsNotEmpty()
  mailSubject: string;

  @IsNotEmpty()
  segmentId: number;

  @IsNotEmpty()
  templateId: number;

}