---
title: Error messages
description: What the app's error messages mean and what to do about each one, grouped by area.
sidebar:
  order: 2
---

The messages below are shown exactly as the app shows them. Parts in angle brackets, such as `<sample number>`, are filled in with the real value. Use your browser's find (Ctrl+F) to look one up.

For developers, the same errors with their codes are in [Errors](/help/developers/errors/).

## Everywhere

| Message | Why it happens | What to do |
| --- | --- | --- |
| Something went wrong. Quote the request ID when reporting this. | An unexpected problem on the server. | Try again. If it repeats, send the **Request ID** to your administrator. |
| Something went wrong. Please try again. | The app could not reach the server, or got an answer it did not expect. | Check your connection and try again. |
| Please check the highlighted fields | One or more fields are missing or not valid. | Read the message under each highlighted field. |
| Please sign in | Your session ended. | Sign in again. |
| You do not have permission to do this | Your role does not allow this action. | Ask your administrator. |
| `<Record>` not found | The record does not exist, or was deleted. | Go back to the list and reload it. |
| This record was changed by someone else. Reload and try again. | Someone saved the same record while you had it open. | Reload, check their change, and make yours again. |
| This record was changed by someone else. The latest version has been loaded. | As above; the app has already reloaded it. | Check the record and make your change again. |
| Someone else changed `<this draft / the profile / the branding / …>`. It has been reloaded. | As above. | Make your change again. |
| Someone else changed this at the same moment. Nothing was saved, so please try again. | Two saves arrived together. | Try again. |
| The system is busy and could not finish in time. Nothing was saved, so please try again. | The server was overloaded for a moment. | Try again. |
| A record with this value already exists | A code or number that must be unique is already used. | Choose another value. |
| This record is linked to other records, so it cannot be changed this way. | Other records depend on this one. | Deactivate it instead of deleting it, or change the linked records first. |
| A reason is required | This change is recorded with a reason. | Type a reason. |
| Cannot move from `<status>` to `<status>` | The record's current status does not allow that step. | Reload: someone may have moved it already. |
| You are offline | The device lost its connection. | Select **Try again** when you are back online. Nothing you saved is lost. |

## Signing in and your account

| Message | Why it happens | What to do |
| --- | --- | --- |
| Incorrect email or password. After 5 failed attempts an account is locked for 15 minutes; use Forgot password if you are unsure. | Wrong email or password, or the account is locked. | Check and try again, wait 15 minutes, or use **Forgot password**. |
| Too many attempts. Wait a minute and try again. | Many sign-in attempts in a short time. | Wait a minute. |
| Too many failed sign-ins from this network. Wait ten minutes and try again. | Many failed sign-ins from your office's network. | Wait ten minutes. |
| Incorrect code | The two-factor code is wrong. | Enter the code currently shown in your authenticator app. |
| Sign-in expired. Start again. | You took more than 5 minutes to enter the two-factor code. | Sign in again. |
| Too many attempts. Start again. | Too many wrong two-factor codes. | Sign in again. |
| Choose a new password to continue | You have a temporary password. | Choose your own password. |
| Password needs `<what is missing>` | The new password is too weak. | Use at least 10 characters with upper and lower case, a digit and a symbol. |
| Current password is incorrect | The current password you typed is wrong. | Type it again. |
| This reset link is invalid or has expired | The link is old or incomplete. | Use **Forgot password** again. |
| This reset link has already been used | Each link works once. | Use **Forgot password** again. |
| Confirm your password to continue with this change. | A sensitive change needs your password again. | Enter your password. |
| Incorrect password | The password you confirmed is wrong. | Type it again. |
| Security token missing or invalid. Reload the page and try again. | The page is out of date with your session. | Reload the page. |
| Two-factor login is available for Admin, Signatory and Accounts roles | Your role cannot use two-factor login. | No action needed. |

## Access and administration

| Message | Why it happens | What to do |
| --- | --- | --- |
| You don't have access to this page | Your role does not include the page. | Select **Request access** with a reason. |
| You have already asked for access to this page. An administrator will answer it. | A request is already waiting. | Wait for the answer. |
| You have made several access requests today. Wait for an answer before asking again. | Daily limit on requests. | Wait for an answer. |
| You cannot answer your own access request | Another administrator must answer it. | Ask another administrator. |
| You can only grant permissions you hold yourself. Missing: `<permissions>` | You tried to give a permission you do not have. | Ask an administrator who holds it. |
| You can't give the role `<role>`: it includes permissions you don't have (…). | As above, for a whole role. | Ask an administrator who holds them. |
| At least one role in use must keep user management | The change would leave nobody able to manage users. | Keep user management on at least one role in use. |
| You cannot remove your own access to user management | Prevents locking yourself out. | Ask another administrator. |
| You cannot deactivate your own account | Prevents locking yourself out. | Ask another administrator. |
| A reason is required to change this control | Separation-of-duties and impartiality controls are audited. | Type a reason. |
| `<Module>` is turned off for this laboratory. An administrator can turn it on in Admin, Modules. | The lab turned the module off. | An administrator can turn it on. See [Modules](/help/admin/modules/). |
| `<Module>` is not set up for this laboratory yet. | The module needs a server setting first. | Ask your administrator. |
| Some details need correcting | The lab profile has fields that are not valid. | Read the message under each field. |
| The picture is larger than 2 MB | Branding pictures are limited to 2 MB. | Use a smaller file. |
| Use a PNG, JPEG or WebP picture | That file type is not accepted for branding. | Save the picture as PNG, JPEG or WebP. |
| The template needs correcting | An email template has an unknown value or an unclosed passage. | Fix the parts the preview marks. |
| Incorrect setup token | The first-run token is wrong. | Copy `SETUP_TOKEN` again from the server's `secrets.env`. |
| Setup has already been completed | A user already exists. | Sign in instead. |

## Customers and masters

| Message | Why it happens | What to do |
| --- | --- | --- |
| That GSTIN is not valid | The GSTIN's format or check digit is wrong. | Check the GSTIN against the certificate. |
| The GSTIN belongs to a different state | The GSTIN's first two digits do not match the state. | Fix the state or the GSTIN. |
| That PAN is not valid | The PAN's format is wrong. | Check the PAN. |
| A PIN code is six digits and does not start with 0 | The PIN code is not valid. | Enter the six-digit PIN code. |
| Only one primary contact is allowed | Two contacts are marked primary. | Mark only one. |
| That is not a readable Excel file | The import file is not an Excel workbook. | Save it as `.xlsx` and try again. |
| Import at most `<number>` rows at a time | The import file is too large. | Split it into smaller files. |
| Minimum cannot be above maximum | A limit's minimum is greater than its maximum. | Swap or fix the values. |
| Rate cannot be negative | A negative rate was entered. | Enter zero or more. |
| Bind these formula inputs to parameters: `<inputs>` | A formula input is not linked to a parameter. | Link each input. |

## Quotations and booking

| Message | Why it happens | What to do |
| --- | --- | --- |
| Only a draft can be edited. Revise this quotation to make changes. | The quotation has been sent or decided. | Use **Revise**. |
| The validity date has passed. Change it before sending. | The quotation's validity date is in the past. | Set a new date. |
| This quotation expired on `<date>`. Revise it to accept. | It expired before acceptance. | Revise it. |
| Only an accepted quotation can be converted | You tried to book from a quotation that is not accepted. | Accept it first. |
| This quotation has already been converted | A job already exists for it. | Open that job. |
| No rate is set for `<test>`. Enter one with a reason, or add a rate in Masters. | The test has no price. | Enter a rate with a reason, or add one in **Masters**. |
| You do not have permission to override a rate | Your role cannot change prices. | Ask someone in Sales or Accounts. |
| You do not have permission to book a job without a quotation | Your role must book from quotations. | Book from an accepted quotation. |
| This job can no longer be edited / This sample can no longer be edited | The work has moved on too far. | Ask a supervisor; a cancellation or revision may be needed. |
| Choose up to 12 photos | Too many photos on one acknowledgement or sample. | Choose 12 or fewer. |
| `<number>` photo(s) or the acknowledgement could not be sent. Add or send them on the job page. | The job was booked, but something after it failed. | Open the job and add or send them there. The booking is safe. |

## Planning and testing

| Message | Why it happens | What to do |
| --- | --- | --- |
| This test has no parameters. Add them in Masters before planning. | The test master is incomplete. | Add parameters in **Masters**. |
| `<test>` is already planned on `<sample>` | It is already in a plan. | No action needed. |
| `<test>` must be planned before it is assigned | Assignment needs a plan. | Plan it first. |
| The analyst is not authorised for `<test>`. Authorise them in Quality, Competency, or choose someone who is. | The lab requires authorisation. | Authorise the analyst, or choose another. |
| A cancelled sample cannot be planned | The sample was cancelled. | No action needed. |
| This job is on hold / This job has been cancelled | Work on the job is paused or stopped. | Ask the planner. |
| This test is assigned to someone else | Only the assignee can enter results. | Ask for it to be reassigned. |
| `<instrument>` is past its calibration due date and cannot be used | The lab blocks overdue instruments. | Use another instrument, or record the calibration in **Quality**. |
| Start the test before completing stages | The test has not been started. | Select **Start test** first. |
| Complete the earlier stages first | Stages complete in order. | Finish the earlier stage. |
| Complete every stage before submitting | Some stages are open. | Complete them. |
| Enter a result for: `<parameters>` | Some parameters have no value. | Enter the missing results. |
| `<parameter>`: `<problem>` | An entered result is not valid. The message appears on that input. | Correct the value. What you typed is kept. |
| Results can only be changed while the test is in progress | The results were submitted. | Ask the approver to send it back. |
| You cannot approve results you entered | Separation of duties. | Someone else must approve. |

## Reports

| Message | Why it happens | What to do |
| --- | --- | --- |
| The reviewer and signatory of a report must be different people | Separation of duties. | Someone else must sign. |
| Some tests are still being re-tested | A retest is open. | Wait for the retest to be approved. |
| Only a draft can be corrected | The report is past draft. | Revise the issued report instead. |
| Only an issued report can be emailed / sent / revised | The report is not issued yet. | Issue it first. |
| The final PDF is still being prepared. Try again in a moment. | The signed PDF is being made. | Wait a moment. |
| This customer has report release withheld until payment is received | The customer's reports are held until invoices are paid. | Record the payment, or ask Accounts. |
| `<report>` has been approved. Revise that report instead. | You tried to cancel work with an approved report. | Revise the report. |
| Only photographs of this sample can be printed on its report | A photo from another sample was chosen. | Choose this sample's photos. |
| Photos can only be added while the report is a draft | The report is past draft. | Start a revision to change photos. |

## Dispatch

| Message | Why it happens | What to do |
| --- | --- | --- |
| `<report>` has not been issued | Only issued reports can be dispatched. | Issue it first. |
| Enter the courier and docket number | Required for courier dispatch. | Fill them in. |
| Enter the person carrying it and their contact details | Required for hand delivery. | Fill them in. |
| This sample is not marked as returnable | Only returnable samples can be returned. | Check the sample. |
| This sample was returned to the customer / has already been disposed of | It has already left the lab. | No action needed. |

## Invoices and payments

| Message | Why it happens | What to do |
| --- | --- | --- |
| These jobs have no approved tests left to bill | Everything is billed, or nothing is approved yet. | Check the job. |
| No rate is set for `<test>` on `<sample>`. Add one in Masters first. | A test has no price. | Add the rate in **Masters**. |
| All jobs on an invoice must belong to one customer | Jobs from different customers were chosen. | Invoice them separately. |
| Issued invoices cannot be edited. Cancel it or raise a credit note. | Issued invoices are final. | Cancel it, or raise a credit note. |
| This invoice has payments or credit notes. Reverse them first. | It cannot be cancelled while money is held against it. | Reverse the payments or credit notes. |
| That is more than the balance on `<invoice>` | The payment is larger than what is owed. | Enter the balance or less; record the rest as an advance. |
| You have allocated more than the payment | The split across invoices adds up to more than was paid. | Reduce the allocations. |
| Only `<amount>` is left on this payment | Not enough left to apply. | Apply that amount or less. |
| The credit of `<amount>` is more than the balance of `<amount>` | The credit note is too large. | Reduce it. |
| Only unpaid invoices can be reminded | The invoice is paid. | No action needed. |
| This customer has no contact email. Enter an address. | No email to send to. | Type an address, or add one to the customer. |

## Documents and files

| Message | Why it happens | What to do |
| --- | --- | --- |
| Preparing the document… | The document is being made. | Wait a few seconds. |
| `<name>` is ready | Your browser blocked the new tab. | Select **Open**. |
| This is taking longer than expected. Please try again shortly. | The document did not finish within 2 minutes. | Try again shortly. |
| The document could not be produced. Please try again. | A problem on the server. | Try again; tell your administrator if it repeats. |
| Too many documents requested in the last minute. Wait a moment and try again. | More than 30 in a minute. | Wait a minute. |
| This report has more than `<number>` rows, which is too many for a PDF. Narrow the filters or export to Excel. | The PDF would be too large. | Narrow the filters, or use Excel. |
| The file is too large | Over the upload limit (15 MB unless your administrator changed it). | Use a smaller file. |
| The file is empty | The file has no content. | Choose the right file. |
| Only PDF, images (PNG, JPEG, WebP), Word, Excel and CSV files are accepted | That file type is not allowed. | Save it in an accepted format. |
| Only an empty folder can be removed. Move or remove what is inside it first. | The folder has files. | Empty it first. |
| Files made by the system (reports, invoices, attachments) are managed on their own record, not here. | System files belong to their record. | Open the record. |
| This link has expired or been used up. Ask for a new QR code on the computer. | A **Use phone** link ended. | Show a new QR code. |
| Only photos can be sent from a phone | Another file type was chosen on the phone. | Choose a photo. |

## Email and WhatsApp

| Message | Why it happens | What to do |
| --- | --- | --- |
| The mail server refused or could not be reached: `<reason>` | The test email failed. | An administrator checks the mail settings. See [Email (SMTP)](/help/integrations/email-smtp/). |
| WhatsApp is not set up for this laboratory. | No WhatsApp connection on the server. | See [WhatsApp](/help/integrations/whatsapp/). |
| WhatsApp is not set up: add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to the server settings. | Shown to administrators on the test send. | Add both settings on the server. |
| Enter a WhatsApp mobile number, with the country code for numbers outside India | The number is not a mobile number. | Enter a valid mobile number. |
| WhatsApp could not deliver it: `<reason>` | WhatsApp refused the message. | Read the reason; check the number and the template. |
| Only an issued invoice can be sent / Only an issued report can be sent | Drafts cannot be sent. | Issue it first. |
| Template names are lower-case letters, digits and underscores | The template name is not valid. | Enter it exactly as approved in WhatsApp Manager. |

## Quality and privacy

| Message | Why it happens | What to do |
| --- | --- | --- |
| Record the correction or the root cause first | A non-conformance step needs this. | Fill it in. |
| Record the corrective action first | As above. | Fill it in. |
| Record how the action was verified as effective first | As above. | Fill it in. |
| Someone other than the owner must verify and close it | Independent verification. | Ask someone else. |
| `<person>` is already authorised for `<test>` | An authorisation exists. | No action needed. |
| This authorisation was already withdrawn | No action needed. | No action needed. |
| That date is in the future | The date cannot be later than today. | Enter today or earlier. |
| This request has already been answered | The privacy request is closed. | No action needed. |
| Only an erasure request or a withdrawal of consent can erase data | Erasure needs the right request type. | Change the request type if appropriate. |

## Related

- [Troubleshooting](/help/troubleshooting/)
- [Errors (for developers)](/help/developers/errors/)
- [Frequently asked questions](/help/troubleshooting/faq/)
