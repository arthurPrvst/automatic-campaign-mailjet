
### How does it work? ? ### 
This module uses Mailjet's API. </br>

We will use their API to: </br>
- Create a "Contact" for every user of your app </br>
- Add them to an already existing ContactList created on Mailjet side </br>
- Update their metadatas (whether or not their profil are verified) </br>
- Create campaign draft</br>
- Send a test mail to a dev adress in order to preview the futur campaign that will be sent </br>
- Schedule the campaign for all user's missing the verification of their profil </br>

#### High picture of the workflow: ####

- A user sign up to your web app. </br>
- A user is created in databse and on Mailjet side as a "Contact" (name, email, hasVerifiedProfil) </br>
- Every day a 6pm05 we generate automatically a campaign draft to ask for the verification of their account (for user's who haven't done it before). </br>
- The campaign is scheduled for 6pm35.
- The draft is sent to you, in order to verify their is no issue in content that will be sent to your user. If an issue occurs, you can delete the scheduled campaign in your Mailjet account. You could then retrigger the campaign generation with Postman once the content is corrected. </br>