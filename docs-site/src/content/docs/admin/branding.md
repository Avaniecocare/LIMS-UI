---
title: Branding
description: Set the app name, colours, logo, browser tab icon and sign-in picture, and see how they apply on screens, documents, emails and in dark mode.
sidebar:
  order: 7
---

**Admin** → **Branding** makes the system look like your laboratory: its name, colours and pictures. The page previews your colours as you edit. Saving applies them for everyone at once, and to documents issued from then on.

<!-- screenshot: admin-branding -->

## Change the name and colours

**Goal**: give the app the laboratory's look.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open **Admin** → **Branding**.
2. Optionally type an **App name**. It shows in the browser tab, the menu and emails. Leave it empty to use the name the server was installed with.
3. Click one of the **Ready-made palettes**, or set each colour yourself with the colour picker or a code like `#1a2b3c`.
4. Optionally type a **Sign-in page line**, a short line under the name on the sign-in page.
5. Tick or untick **Show "Powered by" on the sign-in page**.
6. Look at the **Preview**: a small copy of the app and of a report header.
7. Click **Save branding**. Click **Undo changes** to go back to what is saved.

**Result**: **Branding saved. Everyone sees it now.** If you leave the page without saving, the colours go back to the saved ones.

## Fields

| Field | What it means | Rules |
| --- | --- | --- |
| **App name** | Name in the browser tab, menu and emails. Empty uses the installation's brand name. | Up to 60 characters. |
| **Primary colour** | Buttons, links, and headings on documents. | A colour like `#1a2b3c`. |
| **Accent colour** | Rules and highlights on documents. | A colour like `#1a2b3c`. |
| **Menu colour** | The side menu. Its text colour adjusts itself for contrast. | A colour like `#1a2b3c`. |
| **Background colour** | Behind the pages. Keep it light. | A colour like `#1a2b3c`. |
| **Sign-in page line** | Optional line on the sign-in page. | Up to 160 characters. |
| **Show "Powered by" on the sign-in page** | Shows the product credit on the sign-in page. On by default. | |

A new installation starts with neutral slate colours and the laboratory's initials as its logo.

## Ready-made palettes

Each palette sets all four colours, and each keeps text readable on its colours. Clicking one only fills the fields; nothing is saved until you click **Save branding**.

- **Dark menu**: Slate, Forest, Ocean, Maroon, Indigo, Teal, Emerald, Navy and gold, Royal blue, Midnight, Plum, Rose, Crimson, Saffron, Terracotta, Cocoa, Olive, Charcoal, Steel.
- **Light menu**: Clean white, Mint, Sky, Lavender, Sand.

## Pictures

| Picture | Where it shows | Advice |
| --- | --- | --- |
| **Logo** | On screens, reports, quotations and invoices. | A wide PNG with a transparent background works best. Until one is uploaded, the lab's initials are used. |
| **Browser tab icon** | The browser tab, and the installed app's icon. | A square PNG, at least 64 × 64. |
| **Sign-in picture** | Beside the sign-in form on wide screens, for example a photo of the laboratory. | Optional. |

All pictures: **PNG, JPEG or WebP, up to 2 MB**. The file type is checked from its content, not its name.

### Upload or remove a picture

**Goal**: add or change the logo, tab icon or sign-in picture.

**Who can do it**: Admin (`admin.company.edit`).

**Steps**:

1. Open **Admin** → **Branding** and scroll to **Pictures**.
2. Under the picture, click **Upload** (or **Replace**) and choose the file.
3. To remove a picture, click **Remove**.

**Result**: **Picture saved. It shows everywhere now.** (or **Picture removed**). Pictures save on their own: you do not need to click **Save branding**.

:::note
Issued documents keep the logo they were issued with. Replacing the logo does not change PDFs already issued.
:::

## Where branding applies

- **Screens**: menu, buttons, links, page background, browser tab title and icon, and the phone's status bar colour.
- **Documents**: the primary and accent colours and the logo, captured onto each document when it is issued.
- **Emails**: every email uses a branded layout with the lab's name and colours.
- **Sign-in page**: name, sign-in line, sign-in picture and "Powered by".

## Dark mode

Each person chooses **Light**, **Dark** or **Same as this device** under **Appearance** in their name's menu. This choice is stored only in their own browser.

In dark mode the app adjusts your colours automatically: the primary colour is lightened until it is readable on dark backgrounds, and a light menu colour is replaced by a dark menu. You do not set separate dark colours.

## Related

- [Lab profile](/help/admin/lab-profile/)
- [Email templates](/help/admin/email-templates/)
- [Lab setup wizard](/help/admin/setup-wizard/)
