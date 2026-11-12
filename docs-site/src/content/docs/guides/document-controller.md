---
title: Document Controller
description: The day of the document controller in the LIMS, with step-by-step tasks for folders, uploads, editing and removing files in the file library.
sidebar:
  order: 14
---

The Document Controller runs the lab's file library: the folders, the SOPs, certificates and customer letters in them, and the descriptions that help people find the right version.

## Your day

- You keep the folder structure tidy, for example *SOPs*, *Calibration certificates*, *Customer POs*.
- You upload new and revised documents, describe each one, and link customer documents to the customer.
- You rename or move files when they are filed in the wrong place, and remove superseded ones.
- Colleagues come to you when they cannot find a document. The **System files** tab also lists every report, invoice and attachment the system has produced.

## Screens you use

| Screen | What for |
| --- | --- |
| **Files** | Tabs **Library** and **System files**; folders, uploads, edits and removals |
| **Customers** | Customer details, and each customer's **Files** tab |

The Document Controller role holds `files.view`, `files.manage` and `customers.view`.

:::note
The file library is a module your administrator can turn off. People with `files.view` (by default Admin, Management, Lab Manager / Planner, Quality Manager and you) can browse and download files; only `files.manage` can change them.
:::

## How to create a folder

**Goal**: Add a folder to organise the library.

**Who can do it**: Document Controller (`files.manage`).

**Steps**:

1. Select **Files**. The **Library** tab opens.
2. Next to **Folders**, select the **New folder** button.
3. Enter the **Name**, for example "SOPs".
4. Optional: choose the folder it sits **Inside**.
5. Select **Create folder**.

**Result**: The message "Folder created" appears and the folder is listed.

**Related**: [Files](/help/features/files/)

## How to upload files

**Goal**: Add documents to the library.

**Who can do it**: Document Controller (`files.manage`).

**Steps**:

1. Select **Files**, and open the folder to upload into.
2. Select **Upload**.
3. Select **Choose files** and pick one or more files: PDF, images, Word, Excel or CSV.
4. Optional: choose the **Folder**.
5. Optional: choose a customer in **Link to customer**. Linked files also show on that customer's page.
6. Optional: enter a **Description**, for example "Tensile SOP, revision 3".
7. Select **Upload**.

**Result**: The message "… file(s) uploaded" appears. Each file is checked before it is stored.

<!-- screenshot: files-upload-dialog -->

**Related**: [Files](/help/features/files/)

## How to rename or move a file

**Goal**: Correct a file's name, folder or description.

**Who can do it**: Document Controller (`files.manage`).

**Steps**:

1. Select **Files** and find the file. Use **Search file name or description** if needed.
2. Select the edit button on its row.
3. Change the **Name**, **Folder** or **Description**.
4. Select **Save**.

**Result**: The message "File updated" appears.

**Related**: [Files](/help/features/files/)

## How to remove a file

**Goal**: Take a superseded or wrong file out of the library.

**Who can do it**: Document Controller (`files.manage`).

**Steps**:

1. Select **Files** and find the file.
2. Select the remove button on its row.
3. In **Remove …?**, select **Remove**.

**Result**: The message "File removed" appears. The file leaves the library; its upload and removal stay in the audit trail.

**Related**: [Files](/help/features/files/), [Security](/help/security/)

## How to rename or remove a folder

**Goal**: Change a folder's name or place, or delete an empty folder.

**Who can do it**: Document Controller (`files.manage`).

**Steps**:

1. Select **Files**.
2. To rename or move it, select the edit button next to the folder, change the **Name** or **Inside**, and select **Save**.
3. To remove it, select the remove button next to the folder. The button works only when the folder is empty.

**Result**: The message "Folder updated" or "Folder removed" appears.

**Related**: [Files](/help/features/files/)

## How to find a document the system produced

**Goal**: Find a report, invoice, label or attachment that the system created.

**Who can do it**: Anyone with `files.view`.

**Steps**:

1. Select **Files**, then the **System files** tab.
2. Search by file name.
3. Select the file name, or its download button, to open it.

**Result**: The file downloads or opens.

**Related**: [Files](/help/features/files/), [Documents](/help/features/documents/)

## How to see a customer's files

**Goal**: See every file linked to one customer.

**Who can do it**: Document Controller (`customers.view` and `files.view`).

**Steps**:

1. Select **Customers** and open the customer.
2. Select the **Files** tab.

**Result**: You see the library files linked to that customer. Select **Upload** there to add a file that is already linked to the customer.

**Related**: [Customers](/help/features/customers/)
