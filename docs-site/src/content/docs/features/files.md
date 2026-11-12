---
title: Files
description: Keep the lab's own documents in folders, and find and download every report, invoice and attachment the system holds.
sidebar:
  order: 16
---

**Files** is one place for the lab's documents. The **Library** holds what the lab keeps itself (SOPs, calibration certificates, customer letters and purchase orders), in folders. **System files** lists every file the system made or holds on a record (reports, invoices, quotations, attachments), so you can find and download them.

## Who can use it

| Task | Permission | Default roles |
| --- | --- | --- |
| Browse folders, search, download | `files.view` | Admin, Management, Lab Manager / Planner, Quality Manager, Document Controller |
| Upload, rename, move, describe and remove library files; create, rename, move and remove folders | `files.manage` | Admin, Document Controller |

What you can see in the list also depends on the record a file belongs to:

| A file on… | You also need |
| --- | --- |
| Nothing (a library file in a folder) | nothing more |
| A customer, a job, a sample or a test report | `customers.view` (and `reports.view` for reports) |
| An invoice or a credit note | `invoices.view` |
| A quotation | `quotations.view` |
| An order | `orders.view` |
| A dispatch | `dispatch.view` |
| An instrument | `masters.view` |
| A test (result images and attachments) | `tests.viewAll` |
| A user | `admin.users` |

The **File library** is a module. If your lab has turned it off (Admin → Modules), **Files** disappears from the menu, its page shows **This part of the system is turned off**, and customers' **Files** tab is hidden. Nothing is deleted.

## Where to find it

- Select **Files** in the menu.
- On a customer's page, the **Files** tab shows the library files linked to that customer. See [Customers](/help/features/customers/).

<!-- screenshot: files-library -->

## Find and download a file

**Goal**: open or download a document.

**Who can do it**: anyone with `files.view`.

**Steps**

1. Open **Files**.
2. Choose **Library** for the lab's own documents, or **System files** for files made on records.
3. In **Library**, select a folder on the left: **All files**, **Not in a folder**, or a named folder. The number beside a folder is how many files it holds.
4. To narrow the list, type in **Search file name or description**.
5. Select the file's name, or the download button at the end of its row.

**Result**: PDFs and images open in a new tab. Word, Excel and CSV files download. When nothing matches your search, the list says **No files match your search**.

The list shows:

| Column | What it shows |
| --- | --- |
| **Name** | The file name, with its description underneath |
| **Linked to** | The record the file belongs to, for example a job or a customer with its number, or **—** for a library file linked to nothing |
| **Folder** | The library folder, or **—** |
| **Size** | The file size |
| **Added** | When it was added, and by whom |

:::note
Every download is recorded in the audit log. The download link is short-lived (five minutes); open the file again from **Files** if you need it later.
:::

## Upload files

**Goal**: add documents to the library.

**Who can do it**: Document Controller or Admin (`files.manage`).

**Steps**

1. Open **Files**, **Library**. Select the folder you want first if you like; the upload goes there by default.
2. Select **Upload**.
3. In **Upload files**, drag the files onto the box, or select **Choose files**. You can pick several at once.
4. Check **Folder**.
5. Optionally pick a customer in **Link to customer**.
6. Optionally write a **Description**.
7. Select **Upload**.

**Result**: a toast says how many files were uploaded, for example **2 file(s) uploaded**. Any file that was refused is named in a toast starting **Not uploaded:**, with the reason. One refused file does not stop the others.

<!-- screenshot: files-upload-dialog -->

| Field | What it means | Required |
| --- | --- | --- |
| Files | PDF, images (PNG, JPEG, WebP), Word (.docx), Excel (.xlsx) or CSV. Each file is checked by its content, not only its name. | Yes |
| **Folder** | Where the file goes. **Not in a folder** keeps it at the top level. | No |
| **Link to customer** | Shows the file on that customer's **Files** tab too. Offered only if you hold `customers.view`. | No |
| **Description** | A note shown under the name and found by search, for example "Tensile SOP, revision 3". Up to 1,000 characters. | No |

:::caution
A file larger than the server's upload limit (15 MB unless your administrator changed it) is refused with **The file is too large**. Other types are refused with **Only PDF, images (PNG, JPEG, WebP), Word, Excel and CSV files are accepted**.
:::

## Upload a file for a customer

**Goal**: keep a customer's letter, purchase order or certificate with their history.

**Who can do it**: `files.manage` and `customers.view`.

**Steps**

1. Open the customer's page and select the **Files** tab.
2. Select **Upload**.
3. Choose the files, the **Folder** and a **Description** as above.
4. Select **Upload**.

**Result**: the files are linked to that customer automatically, and appear both on the customer's **Files** tab and in **Files**.

## Rename, move or describe a file

**Goal**: keep the library tidy.

**Who can do it**: `files.manage`. Only library files can be changed here.

**Steps**

1. Find the file in **Library**.
2. Select the pencil (**Edit**) at the end of its row.
3. Change **Name**, **Folder** or **Description**.
4. Select **Save**.

**Result**: a toast says **File updated**. The change is recorded in the audit log with the old and new values.

| Field | What it means | Required |
| --- | --- | --- |
| **Name** | The file's name, up to 200 characters. Characters other than letters, digits, spaces, dots, hyphens and brackets become underscores. | Yes |
| **Folder** | Move the file to another folder, or to **Not in a folder**. | No |
| **Description** | The note shown under the name. | No |

## Remove a file

**Goal**: take a document out of the library.

**Who can do it**: `files.manage`. Only library files can be removed here.

**Steps**

1. Find the file in **Library**.
2. Select the bin (**Remove**) at the end of its row.
3. Type the **Reason**.
4. Select **Remove**.

**Result**: a toast says **File removed** and the file leaves the list. Its upload and removal stay in the audit trail.

:::caution
You cannot get a removed file back from this screen.
:::

## Manage folders

**Goal**: organise the library into folders and sub-folders.

**Who can do it**: `files.manage`.

**Steps to create a folder**

1. Open **Files**, **Library**.
2. Select **New folder** (the folder-plus button beside **Folders**).
3. Type a **Name**.
4. Choose where it goes in **Inside**: **Top level**, or inside another folder.
5. Select **Create folder**.

**Result**: a toast says **Folder created** and the folder appears in the tree.

**Steps to rename or move a folder**

1. Point at the folder in the tree (or move to it with the keyboard) to show its buttons.
2. Select the pencil (**Edit folder**).
3. Change **Name** or **Inside**.
4. Select **Save**.

**Result**: a toast says **Folder updated**.

**Steps to remove a folder**

1. Point at the folder in the tree.
2. Select the bin (**Remove folder**).

**Result**: a toast says **Folder removed**. The button is greyed out while the folder holds files. A folder that still holds sub-folders is refused with **Only an empty folder can be removed. Move or remove what is inside it first.**

| Field | What it means | Required |
| --- | --- | --- |
| **Name** | The folder's name, up to 120 characters, for example SOPs, Calibration certificates, Customer POs. Two folders in the same place cannot share a name. | Yes |
| **Inside** | The parent folder, or **Top level**. A folder cannot be moved inside itself or its own sub-folders. | No |

## System files

**Goal**: find a report, invoice, quotation or attachment without opening its record.

**Who can do it**: anyone with `files.view`, for the records they may see (see the table at the top).

**Steps**

1. Open **Files** and select **System files**.
2. Search by file name or description.
3. Select the file's name or its download button.

**Result**: the file opens or downloads.

System files are managed on their own record, so here they can only be found and downloaded. There is no **Upload**, edit or remove. To replace a report, revise it; to correct an invoice, issue a credit note.

## On a phone

**Files** works in a simplified layout on a phone: the folder list sits above the files, and each file shows as a card with its first columns and the rest under **More details**. Dragging files onto the upload box needs a computer; on a phone use **Choose files**.
<!-- TODO(verify): the upload box's drag and drop on phones is assumed unavailable; Choose files works everywhere. -->

See [Using the LIMS on a phone](/help/guides/on-a-phone/).

## Settings that affect it

None of the lab settings change the file library. The upload size limit is a server setting (`MAX_UPLOAD_BYTES`) set by whoever runs the server.

## Tips

- Use descriptions: search looks at the description as well as the name.
- Link customer letters and purchase orders to the customer, so they are on the customer's **Files** tab when someone looks at their history.

## Limitations

- Files can be linked only to a customer from this screen.
- Files have no versions. To replace a document, upload the new one and remove the old one, or keep both with clear names.
- Files you export from reports and lists belong to no record.
<!-- TODO(verify): such exports are meant to be visible only to the person who made them, but the document worker stores them without a creator, so they may not appear in Files for anyone. -->

## Related

- [Customers](/help/features/customers/)
- [Documents the system produces](/help/features/documents/)
- [Send photos from your phone](/help/features/phone-upload/)
- [Quality](/help/features/quality/)
