
### Step 1 - Account creation

Create a MailJet account [here](https://fr.mailjet.com). </br>

### Step 2 - Install mailjet dependency

Install the `node-mailjet` dependency in the `backend` directory of your project.

```
npm install node-mailjet@3.3.1
```

### Step 3 - Mailjet credentials

Add your mailjet API credentials in your environments files (DEV, STAGING & PROD) found in the `backend/src/environments` directory.

```
export const environment = {
  ...,
  mailjet: {
    apiKey: '%YOUR_API_KEY%',
    secretKey: '%YOUR_SECRET_KEY%',
    contactListID: TODO_LATER,
  },
  ...
};
```

Your credentials can be found using [this link](https://app.mailjet.com/account/api_keys).

### Step 4 - Contact lists config
Create two contact lists in your Mailjet account. One will be used in dev env `mylist_dev` and the other one will be used for production `mylist_prod`. </br>

To do so, in your Mailjet account : "Contact" > "Contact List" > "Create a contact a list". </br>
Properties of your user should contains at least "email" (string), "name" (string) and hasVerified (boolean).
The first one will be used as the destination address, the name will be used in the template to personnalize the email content and the "hasVerified" will be used to select only contact that need to be targetted by our profil verification campaign. </br>

Once created, the the contactListID in `backend/src/environments` in the mailjet config.

### Step 5 - Segment config
A segment is a subset of contacts from a contact list that matchs your condition on the metadatas of the contact. </br>
In our case, we'll create a segment "verification_not_done" that will contains all contact from `mylist_prod` having `hasVerified` properties equal to `false`.

### Step 6 - Mail template config
Create your campaign template with your Mailjet account : "Models" > "My Marketing Models" > "Create a new model". </br>
Once created, copy the ID of the template and set it as value of `ACCOUNT_VERIFICATION_TEMPLATE` in `campaign-templates.enum.ts`.

### Step 7 - Back
Add folder `backend/campaign` in your `backend/src/api`. </br>
Don't forget to add `CampaignModule` in the imports of the `app.module`. </br>

Add folder `backend/mailer` in your `backend/src/shared`. </br>
Don't forget to add `MailerModule` in the imports of the `app.module`. </br>

### Step 8 - Contact creation on sign up
When your user sign up, you should create a contact on mailjet side.

To do so, in file `backend/src/api/auth.controller.ts` add:

<pre>
import { MailerService } from '../../shared/mailer/mailer.service';

...

    @Post('signup')
    async signUp(@Body() createUserDto: CreateUserDto): Promise<{ success: boolean, token?: string, id?: number }> {
        
        ...

        const mailjetContact = await this.mailService.createContact(user);

        if (mailjetContact.body.Data[0].ID) {
            console.log("Mailjet contactID", mailjetContact.body.Data[0].ID);
            await this.mailService.addContactToContactList(mailjetContact.body.Data[0].ID);

            await this.usersService.update(user, { contactId: mailjetContact.body.Data[0].ID });
            await this.mailService.updateDefaultContactMetadatas(mailjetContact.body.Data[0].ID, createUserDto.firstname);
        }
</pre>

You can then verify in your contactList on your mailjet acccount the new user created on sign up.

### Step 9 - Automatic campaign creation
Every friday at 6pm05, your campaign will be created, and scheduled at 6pm35 on all users that did not verify their account. </br>
<pre>
    // Every friday at 6pm05
    @Cron('0 5 18 * * 5', {
        name: 'sendMarketingCampaignVerifyAccount',
        timeZone: 'Europe/Paris',
    })
    async sendMarketingCampaignVerifyAccount() {
        ...
    }
</pre>

To make the [NestJS cron](https://docs.nestjs.com/techniques/task-scheduling) work, please install following dependencies: 
<pre>
    npm install --save @nestjs/schedule
    npm install --save-dev @types/cron
</pre>

Side note: if you backend is meant to be scaled (in an AWS ElasticBeanStack environment for example), please consider an improvement of the cron process needed to avoid duplicated campaign generation.

### Bonus

To avoid any issue being categorized as "SPAM" you should configure the SPF and DKIM configuration for your sending mail address and your domain.
To do so, go in your Mailjet profil > "Preferences" > "Domains" > "DKIM/SPF authentication". See a complete documention [here](https://documentation.mailjet.com/hc/fr/articles/360043050113-How-to-setup-DomainKeys-DKIM-and-SPF-in-my-DNS-records-).

That's it ! :rocket:


