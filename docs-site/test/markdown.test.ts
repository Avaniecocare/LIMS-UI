// The Ask AI answer renderer must never turn model output into live HTML or a link off this site.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderAnswer, safeHelpLink } from '../src/lib/markdown.ts';

const origin = 'https://lims.example.com';

test('escapes HTML and script', () => {
  assert.ok(!renderAnswer('<script>alert(1)</script>', origin).includes('<script'));
  assert.ok(!/<img/i.test(renderAnswer('<img src=x onerror=alert(1)>', origin)));
  assert.ok(!/<strong[^>]*onmouseover/.test(renderAnswer('**bold" onmouseover="x**', origin)));
});

test('keeps links into the help site only', () => {
  assert.equal(safeHelpLink('/help/features/booking/#x', origin), '/help/features/booking/#x');
  for (const bad of ['javascript:alert(1)', 'https://evil.example/help/a', 'data:text/html,<b>x</b>', '/admin', '//evil.example/help/']) assert.equal(safeHelpLink(bad, origin), null, bad);
  assert.equal(renderAnswer('[click](javascript:alert(1))', origin), '<p>click</p>');
  assert.equal(renderAnswer('[Book](/help/features/booking/)', origin), '<p><a href="/help/features/booking/">Book</a></p>');
});

test('formats lists, bold and code', () => {
  assert.equal(renderAnswer('1. One\n2. **Two**', origin), '<ol><li>One</li><li><strong>Two</strong></li></ol>');
  assert.equal(renderAnswer('- `a`\n- b', origin), '<ul><li><code>a</code></li><li>b</li></ul>');
});
