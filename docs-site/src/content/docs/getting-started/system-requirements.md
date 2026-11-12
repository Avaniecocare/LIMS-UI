---
title: System requirements
description: The browsers, screens, printers, scanners, cameras and network the LIMS needs on your computer, tablet or phone.
sidebar:
  order: 4
---

The LIMS runs in a web browser. There is nothing to install on your computer. This page is about the devices people use; for the server, see [Server requirements](/help/install/requirements/).

## Browsers

Use an up-to-date version of one of these browsers:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Apple Safari (Mac, iPhone and iPad)

Keep your browser updated. Older browsers may not display the pages correctly.
<!-- TODO(verify): minimum browser versions. The app uses Tailwind CSS 4 and React 19, which need recent browsers (roughly Chrome/Edge 111+, Safari 16.4+, Firefox 128+); no browserslist is set in the project. -->

The browser must allow:

- **Pop-ups from the LIMS address.** Documents such as reports, labels and invoices open in a new tab once they are ready. If the browser blocks the tab, a message says the document is ready and offers **Open**.
- **Cookies for the LIMS address.** Your sign-in uses them.

## Screens

The LIMS adapts to the width of the screen.

| Device | Width | What you get |
| --- | --- | --- |
| Desktop or laptop | 1024 pixels and wider | The full app. The menu can stay open beside the page. |
| Tablet | 768 to 1023 pixels | The full app, with touch-sized controls. The menu opens over the page. |
| Phone | Narrower than 768 pixels | A phone layout: a bottom bar, cards instead of wide tables, and page actions within thumb reach. |

A few screens are built for a larger screen: booking samples, editing a quotation, planning, masters, admin, lab setup, analytics and MIS reports. On a phone they first say **Best on a larger screen**, and you can still choose **Continue anyway**. See [Using the LIMS on a phone](/help/guides/on-a-phone/).

You can install the LIMS on a phone or tablet so it opens like an app. It still needs a connection; no lab data is kept on the device.

## Printers

Every document is a PDF that opens in a new tab, so any printer your computer can print to will do.

- **Reports, invoices, quotations, challans, job cards**: A4 office printer.
- **Sample labels**: the label PDF is sized 70 × 40 mm, one label per page, with the sample number as text and a QR code. Use a label printer that takes 70 × 40 mm labels, or print on A4 and cut.
<!-- TODO(verify): whether A4 printing of the 70 x 40 mm label PDF is a supported practice in the lab, or a label printer is required. -->

## Barcode scanners

A USB or Bluetooth barcode scanner set to **keyboard mode** (it types the code and presses Enter) works on any screen without setup. Scan a sample, job, report, invoice or customer number and the record opens. The scanner must read QR codes to read the sample labels the LIMS prints.

## Cameras

Cameras are optional and used for:

- **Scanning a label on a phone**: **Scan a label** reads QR codes and common barcodes with the phone's camera. It appears only where the browser can decode codes, for example Chrome on Android.
- **Photos at booking, on tests and on reports**: **Take photo** uses the computer's webcam. **Use phone** shows a QR code that lets a phone send photos to that record without signing in.

The browser asks for permission the first time. If you refuse, allow camera access for the LIMS address in the browser's site settings.

## Network

- The LIMS needs a working connection to the server. Pages, data and documents always come from the server.
- If the connection drops, the page "You are offline" appears. Nothing you saved is lost; select **Try again** when you are back online.
- Results you type on a test are saved as you go. If a save fails, the page tells you and offers to try again, and asks before you leave with unsaved entries.
- Emails and WhatsApp messages are sent by the server, not your device.

## Related

- [Quick start](/help/getting-started/quick-start/)
- [Using the LIMS on a phone](/help/guides/on-a-phone/)
- [Server requirements](/help/install/requirements/)
- [Search and scanning](/help/features/search-scanning/)
