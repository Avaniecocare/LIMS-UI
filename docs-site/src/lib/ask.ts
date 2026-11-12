import { apiUrl } from './api';
import { renderAnswer } from './markdown';

interface Status {
  enabled: boolean;
  signedIn: boolean;
  requireLogin: boolean;
  maxQuestionLength: number;
  turnstileSiteKey: string | null;
  supportEmail: string | null;
}
interface Source {
  title: string;
  url: string;
  heading: string | null;
}
type Turn = { role: 'user' | 'assistant'; content: string };

const HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'lims-help' };
// The server keeps only the last few turns as well; this keeps requests small.
const MAX_TURNS = 4;

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; execute: (id: string) => void; reset: (id: string) => void };
  }
}

export function mountAskAi() {
  const open = document.querySelector<HTMLButtonElement>('[data-askai-open]');
  const panel = document.getElementById('askai-panel');
  if (!open || !panel) return;
  // Out of the page layout's stacking contexts (the side columns would otherwise sit above the button).
  document.body.append(open, panel);
  const log = panel.querySelector<HTMLElement>('[data-askai-log]')!;
  const form = panel.querySelector<HTMLFormElement>('[data-askai-form]')!;
  const input = form.querySelector<HTMLTextAreaElement>('textarea')!;
  const send = form.querySelector<HTMLButtonElement>('[data-askai-send]')!;
  const count = form.querySelector<HTMLElement>('[data-askai-count]')!;
  const starters = panel.querySelector<HTMLElement>('[data-askai-starters]')!;
  const support = panel.querySelector<HTMLElement>('[data-askai-support]')!;
  const captchaBox = form.querySelector<HTMLElement>('[data-askai-captcha]')!;
  const history: Turn[] = [];
  let status: Status | null = null;
  let busy = false;
  let widgetId: string | null = null;
  let pendingToken: ((t: string | null) => void) | null = null;

  const setOpen = (on: boolean) => {
    panel.hidden = !on;
    open.setAttribute('aria-expanded', String(on));
    if (on) {
      void loadStatus();
      input.focus();
    } else open.focus();
  };
  open.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-askai-close]')!.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  input.addEventListener('input', () => {
    const max = status?.maxQuestionLength ?? 500;
    count.textContent = input.value.length > max * 0.8 ? `${input.value.length}/${max}` : '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  starters.querySelectorAll<HTMLButtonElement>('[data-starter]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.textContent ?? '';
      form.requestSubmit();
    }),
  );

  async function loadStatus() {
    if (status) return;
    try {
      const res = await fetch(apiUrl('/help/status'), { credentials: 'include', headers: { 'X-Requested-With': 'lims-help' } });
      status = (await res.json()) as Status;
    } catch {
      status = { enabled: false, signedIn: false, requireLogin: false, maxQuestionLength: 500, turnstileSiteKey: null, supportEmail: null };
    }
    input.maxLength = status.maxQuestionLength;
    if (status.supportEmail) {
      support.hidden = false;
      support.innerHTML = '';
      support.append('Still stuck? ');
      const a = document.createElement('a');
      a.href = `mailto:${status.supportEmail}`;
      a.textContent = 'Contact support';
      support.append(a);
    }
    if (!status.enabled) return notice('The help assistant is not available right now. Use Search at the top of the page instead.');
    if (status.requireLogin && !status.signedIn) return notice('Sign in to the LIMS to ask the help assistant. Search works without signing in.');
    if (status.turnstileSiteKey && !status.signedIn) mountCaptcha(status.turnstileSiteKey);
  }

  function notice(text: string) {
    const p = document.createElement('p');
    p.className = 'askai-msg askai-system';
    p.textContent = text;
    log.append(p);
    send.disabled = true;
    input.disabled = true;
  }

  function mountCaptcha(siteKey: string) {
    const render = () => {
      widgetId = window.turnstile!.render(captchaBox, {
        sitekey: siteKey,
        size: 'invisible',
        execution: 'execute',
        callback: (t: string) => pendingToken?.(t),
        'error-callback': () => pendingToken?.(null),
      });
    };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.append(s);
  }

  /** A fresh, single-use human check for this question (only for visitors who are not signed in). */
  function captchaToken(): Promise<string | null> {
    if (!widgetId || !window.turnstile) return Promise.resolve(null);
    return new Promise((resolve) => {
      pendingToken = (t) => {
        pendingToken = null;
        resolve(t);
      };
      window.turnstile!.reset(widgetId!);
      window.turnstile!.execute(widgetId!);
    });
  }

  function bubble(role: 'user' | 'assistant') {
    const el = document.createElement('div');
    el.className = `askai-msg askai-${role}`;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    busy = true;
    send.disabled = true;
    starters.hidden = true;
    bubble('user').textContent = question;
    input.value = '';
    const answerEl = bubble('assistant');
    answerEl.setAttribute('aria-busy', 'true');
    answerEl.textContent = 'Searching the documentation…';
    let text = '';
    let id: string | null = null;
    let sources: Source[] = [];
    try {
      const token = await captchaToken();
      const res = await fetch(apiUrl('/help/ask'), {
        method: 'POST',
        credentials: 'include',
        headers: HEADERS,
        body: JSON.stringify({ question, history: history.slice(-MAX_TURNS * 2), turnstileToken: token }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(err?.error?.message ?? 'The help assistant could not answer just now. Try again in a moment.');
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let cut;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const event = /^event: (\w+)/m.exec(frame)?.[1];
          const data = /^data: (.*)$/m.exec(frame)?.[1];
          if (!event || !data) continue;
          const payload = JSON.parse(data);
          if (event === 'meta') {
            id = payload.id;
            sources = payload.sources ?? [];
          } else if (event === 'delta') {
            text += payload.text;
            answerEl.innerHTML = renderAnswer(text, location.origin);
            log.scrollTop = log.scrollHeight;
          } else if (event === 'error') throw new Error(payload.message);
        }
      }
      if (!text) throw new Error('No answer came back. Try rephrasing the question.');
      answerEl.innerHTML = renderAnswer(text, location.origin);
      history.push({ role: 'user', content: question }, { role: 'assistant', content: text });
      decorate(answerEl, id, text, sources);
    } catch (err) {
      answerEl.textContent = err instanceof Error ? err.message : 'Something went wrong.';
      answerEl.classList.add('askai-error');
    } finally {
      answerEl.removeAttribute('aria-busy');
      busy = false;
      send.disabled = false;
      input.focus();
    }
  });

  /** Sources, copy and feedback under an answer. */
  function decorate(el: HTMLElement, id: string | null, text: string, sources: Source[]) {
    if (sources.length) {
      const wrap = document.createElement('div');
      wrap.className = 'askai-sources';
      const label = document.createElement('p');
      label.textContent = 'Sources';
      wrap.append(label);
      const ul = document.createElement('ul');
      for (const s of sources) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        // Source links come from the server's own index, but they are still checked to be pages of this site.
        if (!s.url.startsWith('/help/')) continue;
        a.href = s.url;
        a.textContent = s.heading ? `${s.title} › ${s.heading}` : s.title;
        li.append(a);
        ul.append(li);
      }
      wrap.append(ul);
      el.append(wrap);
    }
    const bar = document.createElement('div');
    bar.className = 'askai-bar';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => void navigator.clipboard?.writeText(text).then(() => (copy.textContent = 'Copied')));
    bar.append(copy);
    if (id) {
      for (const [label, helpful] of [
        ['👍', true],
        ['👎', false],
      ] as const) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.setAttribute('aria-label', helpful ? 'This answer helped' : 'This answer did not help');
        b.addEventListener('click', () => {
          bar.querySelectorAll<HTMLButtonElement>('button[aria-label]').forEach((x) => (x.disabled = true));
          b.setAttribute('aria-pressed', 'true');
          void fetch(apiUrl('/help/feedback'), { method: 'POST', credentials: 'include', headers: HEADERS, body: JSON.stringify({ id, helpful }) }).catch(() => undefined);
        });
        bar.append(b);
      }
    }
    el.append(bar);
  }
}
