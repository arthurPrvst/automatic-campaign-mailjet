import { IsNotEmpty, IsDate } from 'class-validator';

export class UpdateCampaignDraft {
  @IsNotEmpty()
  campaignDraftId: number;

  @IsNotEmpty()
  headers: object;

  @IsNotEmpty()
  htmlPart: object;

  @IsNotEmpty()
  textPart: object;

  @IsNotEmpty()
  mjmlContent: object;

}