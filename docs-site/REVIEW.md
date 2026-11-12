# Help site: things to check

Generated from the page sources. Each `TODO(verify)` is something a writer inferred but could not confirm in the code; resolve it and delete the comment. Each screenshot placeholder marks where a picture would help (`<!-- screenshot: name -->` in the page).

## To verify (37)

| Page | Line | What to check |
| --- | --- | --- |
| /help/admin/audit-log/ | 64 | the database rule could still be switched off by someone with full database owner rights; the deployment can run the app under a non-owner database role to close this. Confirm what the installation guide recommends. |
| /help/admin/numbering/ | 80 | the ULR format field's hint suggests "TC1234{YY}{SEQ:8}F", but the number builder only replaces {PREFIX}, {FY} and {SEQ:n}. A {YY} token would print as typed. Confirm before documenting {YY}. |
| /help/admin/settings/ | 38 | the Settings tab shows the reason box only for keys starting "controls.allow" and for controls.impartiality. controls.requireAuthorisation is sensitive on the server too, so saving it from the tab may fail with "A reason is required" until the screen is fixed. |
| /help/admin/settings/ | 65 | exactly where each report-format value prints on the report PDF. |
| /help/admin/settings/ | 94 | no code reads this setting apart from first-run setup; nothing is deleted automatically. |
| /help/admin/setup-wizard/ | 51 | the server checks brandingVersion > 1; confirm a fresh install starts at version 1 so one save counts. |
| /help/developers/documents/ | 122 | the full parameter list of each document kind, the permission checked by test-data, and the format value for Excel MIS exports. |
| /help/features/account/ | 135 | PUT /notifications/preferences replaces the whole stored preference set with the one type the page sends, so unticking a second type appears to re-tick the first. Check before relying on more than one unticked type. |
| /help/features/booking/ | 154 | confirm that the file picker offers the camera on common phone browsers (accept="image/*" without capture) |
| /help/features/customers/ | 185 | confirm with product whether the New customer form should start from credit.defaultDays instead of 30 |
| /help/features/dispatch/ | 90 | no edit or delete endpoint exists for a dispatch in the API; confirm this is the intended behaviour and that there is no correction route. |
| /help/features/dispatch/ | 230 | Pending tracks dispatched reports by report, not by revision, so an issued revision of an already-dispatched report is not offered again. Confirm with the product owner whether this is intended. |
| /help/features/files/ | 212 | the upload box's drag and drop on phones is assumed unavailable; Choose files works everywhere. |
| /help/features/files/ | 230 | such exports are meant to be visible only to the person who made them, but the document worker stores them without a creator, so they may not appear in Files for anyone. |
| /help/features/invoices-payments/ | 332 | there is no way to reverse a credit note in the API, so an invoice with any credit note can never be cancelled; confirm this is intended. |
| /help/features/mis-reports/ | 151 | exports are stored as files, and the file library is meant to show an export to the person who made it, but the worker stores them without a creator (no request context in worker/worker.ts), so they may not appear in Files at all. |
| /help/features/notifications/ | 100 | each tick sends only the changed kind, and the server replaces all stored preferences with what it receives, so unticking a second kind may re-tick the first. Check updatePreferences in the notifications service. |
| /help/features/orders-quotations/ | 333 | confirm whether the editor should start Document title from quotation.defaultTitle; today it always starts at Quotation |
| /help/features/planning/ | 144 | blockOverdueInstruments is enforced in the testing service (assertInstrument), not when planning or assigning; DECISIONS.md says an overdue instrument "can't be planned". Confirm the intended behaviour. |
| /help/features/planning/ | 193 | the workflow allows Assigned → Planned with planning.edit, but no UI or endpoint for unassigning was found. |
| /help/features/quality/ | 291 | notification links open /quality?tab=nc&id=…, but the Non-conformance tab does not read the id, so the person lands on the list rather than the record. |
| /help/features/reports/ | 168 | confirm the intended way to change a result after issue is Revise, then reject the new revision at review with "Send tests back for re-testing" (the code allows it; no product text describes it). |
| /help/features/search-scanning/ | 134 | which iPhone browsers support the BarcodeDetector API; the code only checks for it and names Chrome on Android as an example. |
| /help/getting-started/system-requirements/ | 20 | minimum browser versions. The app uses Tailwind CSS 4 and React 19, which need recent browsers (roughly Chrome/Edge 111+, Safari 16.4+, Firefox 128+); no browserslist is set in the project. |
| /help/getting-started/system-requirements/ | 47 | whether A4 printing of the 70 x 40 mm label PDF is a supported practice in the lab, or a label printer is required. |
| /help/install/docker/ | 112 | for a new install the logo is set in the app's Branding page; confirm whether files in branding/ are used at all when there is no company.env. |
| /help/install/first-run/ | 104 | after remove-demo.sh no user is left; confirm that the first-run screen then appears again so a real administrator can be created. |
| /help/install/requirements/ | 31 | recommended CPU count per company; not stated in the deployment repository. |
| /help/install/requirements/ | 53 | minimum Docker Compose version; the compose file uses env_file entries with `required: false`. |
| /help/install/requirements/ | 82 | how to give Caddy the lab's own certificates on an on-premise install; the repository does not show it. |
| /help/install/troubleshooting/ | 55 | whether deploy.sh also rewrites the proxy site; only provision.sh calls proxy-sync.sh. |
| /help/integrations/ai-assistant/ | 35 | the exact menu names in the Anthropic Console for workspace spend limits. |
| /help/integrations/ai-assistant/ | 87 | the instructions are shorter than the smallest prompt Claude caches for some models, in which case caching has no effect. |
| /help/integrations/ai-assistant/ | 116 | Anthropic's data retention terms for your account (commercial terms apply to API use). |
| /help/integrations/email-smtp/ | 75 | where the job and quotation pages place the delivery log (reports and invoices use a Delivery tab). |
| /help/integrations/storage/ | 38 | which S3-compatible image the production deployment uses; it is an open decision in the deployment repository. |
| /help/security/data-protection/ | 59 | no code acts on retention.reportYears yet; confirm whether reports past retention are flagged or purged in a later version. |

## Screenshots to add (84)

| Page | Placeholder |
| --- | --- |
| /help/admin/audit-log/ | `admin-audit-log` |
| /help/admin/branding/ | `admin-branding` |
| /help/admin/email-templates/ | `admin-email-templates` |
| /help/admin/help-assistant/ | `admin-help-assistant` |
| /help/admin/ | `admin-tabs` |
| /help/admin/lab-profile/ | `admin-lab-profile` |
| /help/admin/masters/ | `masters-tests` |
| /help/admin/modules/ | `admin-modules` |
| /help/admin/privacy/ | `admin-privacy` |
| /help/admin/setup-wizard/ | `setup-wizard-steps` |
| /help/admin/terms-holidays/ | `admin-terms` |
| /help/admin/users-roles/ | `admin-users` |
| /help/features/account/ | `account-page` |
| /help/features/approvals/ | `approvals-tabs` |
| /help/features/approvals/ | `approvals-report-page` |
| /help/features/booking/ | `booking-from-quotation` |
| /help/features/booking/ | `booking-without-quotation` |
| /help/features/customers/ | `customers-list` |
| /help/features/customers/ | `customers-new-form` |
| /help/features/customers/ | `customers-history-overview` |
| /help/features/dashboard-analytics/ | `dashboard-analytics-my-work` |
| /help/features/dashboard-analytics/ | `dashboard-analytics-charts` |
| /help/features/dispatch/ | `dispatch-pending-tab` |
| /help/features/dispatch/ | `dispatch-record-dialog` |
| /help/features/documents/ | `documents-pdf-letterhead` |
| /help/features/due-invoices/ | `due-invoices-page` |
| /help/features/due-invoices/ | `due-invoices-reminder-dialog` |
| /help/features/email/ | `email-delivery-log` |
| /help/features/files/ | `files-library` |
| /help/features/files/ | `files-upload-dialog` |
| /help/features/invoices-payments/ | `invoices-payments-ready-to-invoice` |
| /help/features/invoices-payments/ | `invoices-payments-issue-dialog` |
| /help/features/invoices-payments/ | `invoices-payments-detail-page` |
| /help/features/invoices-payments/ | `invoices-payments-record-payment` |
| /help/features/jobs-samples/ | `jobs-samples-list` |
| /help/features/jobs-samples/ | `jobs-samples-job-detail` |
| /help/features/jobs-samples/ | `jobs-samples-cancel-dialog` |
| /help/features/jobs-samples/ | `jobs-samples-acknowledgement-dialog` |
| /help/features/mis-reports/ | `mis-reports-catalogue` |
| /help/features/mis-reports/ | `mis-reports-report-view` |
| /help/features/mobile/ | `mobile-dashboard` |
| /help/features/notifications/ | `notifications-bell` |
| /help/features/notifications/ | `notifications-email-preferences` |
| /help/features/orders-quotations/ | `orders-new-form` |
| /help/features/orders-quotations/ | `orders-quotations-editor` |
| /help/features/orders-quotations/ | `orders-quotations-detail` |
| /help/features/phone-upload/ | `phone-upload-qr-dialog` |
| /help/features/phone-upload/ | `phone-upload-phone-page` |
| /help/features/planning/ | `planning-unplanned` |
| /help/features/planning/ | `planning-plan-dialog` |
| /help/features/planning/ | `planning-assign-dialog` |
| /help/features/quality/ | `quality-overview` |
| /help/features/quality/ | `quality-record-equipment-work` |
| /help/features/quality/ | `quality-non-conformance` |
| /help/features/quality/ | `quality-report-a-problem` |
| /help/features/reports/ | `reports-pdf-page-one` |
| /help/features/reports/ | `reports-verify-page` |
| /help/features/search-scanning/ | `search-scanning-results` |
| /help/features/search-scanning/ | `search-scanning-camera` |
| /help/features/testing/ | `testing-my-tests` |
| /help/features/testing/ | `testing-test-page` |
| /help/features/whatsapp/ | `whatsapp-send-dialog` |
| /help/getting-started/quick-start/ | `sign-in-page` |
| /help/getting-started/quick-start/ | `dashboard-my-work` |
| /help/getting-started/quick-start/ | `global-search-results` |
| /help/guides/accounts/ | `invoice-issue-dialog` |
| /help/guides/admin/ | `admin-add-user` |
| /help/guides/authorised-signatory/ | `approve-and-sign-dialog` |
| /help/guides/authorised-signatory/ | `whatsapp-send-report` |
| /help/guides/dispatch/ | `record-dispatch-dialog` |
| /help/guides/document-controller/ | `files-upload-dialog` |
| /help/guides/head-of-department/ | `approvals-results-tab` |
| /help/guides/lab-manager-planner/ | `planning-plan-dialog` |
| /help/guides/management/ | `dashboard-management-tiles` |
| /help/guides/on-a-phone/ | `phone-bottom-bar` |
| /help/guides/on-a-phone/ | `phone-scan-a-label` |
| /help/guides/quality-manager/ | `quality-record-calibration` |
| /help/guides/quality-manager/ | `quality-nc-dialog` |
| /help/guides/report-reviewer/ | `report-correct-draft` |
| /help/guides/sales/ | `quotation-editor-lines` |
| /help/guides/sample-reception/ | `booking-without-quotation` |
| /help/guides/technician-analyst/ | `test-result-entry` |
| /help/install/first-run/ | `first-run-setup` |
| /help/integrations/whatsapp/ | `admin-whatsapp-templates` |
