# Writing the LIMS documentation

For anyone adding or editing pages under `src/content/docs/`. The site is Astro Starlight; it is served at `/help/` on the same address as the app.

## Who reads what

| Section (folder) | Reader |
| --- | --- |
| `getting-started/` | Everyone, first visit |
| `guides/` | Lab staff, one page per role, written as tasks |
| `features/` | Anyone looking up one module: what each field and button does |
| `admin/` | The lab's administrator |
| `integrations/` | The administrator and whoever runs the server |
| `install/` | The person who installs and runs the server (IT) |
| `developers/` | Developers using the API |
| `security/` | Administrators and auditors |
| `troubleshooting/` | Everyone |

## Every page

- Plain Markdown (`.md`), not MDX.
- Front matter:

  ```yaml
  ---
  title: Book samples            # short; matches the UI's words
  description: One sentence that says what the page helps you do.
  sidebar:
    order: 3                     # position within its folder
  ---
  ```

  Pages for signed-in staff only may add `access: staff`; everything else is public (the default). The assistant never answers anonymous visitors from `staff` pages.
- Do not repeat the title as a `#` heading: Starlight prints it. Start with one or two sentences, then `##` sections.

## Task pages ("How to …")

Each task is a `##` (or `###`) section with, in this order:

1. **Goal**: one sentence.
2. **Who can do it**: the role(s) and the permission, e.g. *Sample Reception (`jobs.create`)*.
3. **Before you start**: prerequisites, if any.
4. **Steps**: a numbered list. One action per step. Name buttons and fields **exactly** as the UI shows them, in bold: **Book samples**, **Reason for no quotation**.
5. **Result**: what the person sees when it worked.
6. **Related**: links to other pages.

## Style

- Short sentences. Second person ("you"). Present tense. Active voice.
- UI words exactly as in the code (labels, button text, tab names, statuses as shown, e.g. "In Testing" not `IN_TESTING`). When unsure, read the component; if still unsure, mark it.
- Use tables for fields and settings: **Field**, **What it means**, **Required**.
- Callouts (Starlight asides):

  ```md
  :::note
  Something to know.
  :::

  :::tip
  A faster way.
  :::

  :::caution
  Something that can go wrong or cannot be undone.
  :::
  ```

- Diagrams: a fenced code block with the language `mermaid` (flowchart or sequence). Keep them small.
- Code and commands in fenced blocks with a language (`bash`, `json`, `http`, `ts`).
- Links: absolute, with the `/help` base and a trailing slash, to the page's folder path: `[Book samples](/help/features/booking/)`. Section links: `/help/admin/settings/#reminders`. Never link to the app's internal code.
- Screenshot placeholders where a picture helps: `<!-- screenshot: booking-form -->` (kebab-case name, unique).
- Anything inferred but not confirmed in the code: `<!-- TODO(verify): what to check -->` right after it.

## Never in the docs

Real secrets, keys, passwords, tokens, internal IP addresses, customer or company data, private URLs, or the name of any real laboratory. Use placeholders: `lab@example.com`, `https://lims.example.com`, `<your-token>`. Document environment variables by **name and purpose**, never by a real value.
