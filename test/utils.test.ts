import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '../src/utils/html';
import { dayStringToMs, formatHours, hoursToMs, msToHours, toDayString } from '../src/utils/time';

describe('time', () => {
  it('converts hours and milliseconds', () => {
    expect(hoursToMs(1.5)).toBe(5_400_000);
    expect(hoursToMs(undefined)).toBe(0);
    expect(msToHours(5_400_000)).toBe(1.5);
    expect(msToHours(20 * 60_000)).toBe(0.33);
    expect(msToHours(0)).toBe(0);
  });

  it('round-trips a calendar day in local time', () => {
    const ms = dayStringToMs('2026-10-21')!;
    expect(new Date(ms).getHours()).toBe(12);
    expect(toDayString(ms)).toBe('2026-10-21');
    expect(dayStringToMs('21.10.2026')).toBeUndefined();
  });

  it('formats durations', () => {
    expect(formatHours(1.5)).toBe('1h 30m');
    expect(formatHours(2)).toBe('2h');
    expect(formatHours(0.25)).toBe('15m');
    expect(formatHours(0)).toBe('');
  });
});

describe('htmlToMarkdown', () => {
  it('keeps paragraphs, breaks, lists and emphasis', () => {
    const html =
      '<p>Hello <b>team</b>,<br>see <a href="https://x.dev">docs</a></p><ul><li>one</li><li><i>two</i></li></ul>';
    expect(htmlToMarkdown(html)).toBe(
      'Hello **team**,\nsee [docs](https://x.dev)\n\n- one\n- _two_',
    );
  });

  it('decodes entities and drops unknown tags', () => {
    expect(htmlToMarkdown('<span style="x">a &amp; b&nbsp;&lt;c&gt; &#8470;</span>')).toBe(
      'a & b <c> №',
    );
    expect(htmlToMarkdown(undefined)).toBe('');
  });
});

describe('markdownToHtml', () => {
  it('builds paragraphs and escapes HTML', () => {
    expect(markdownToHtml('Line 1\nLine <2>\n\n**Bold** and _it_ [l](https://a.b)')).toBe(
      '<p>Line 1<br>Line &lt;2&gt;</p><p><b>Bold</b> and <i>it</i> <a href="https://a.b">l</a></p>',
    );
    expect(markdownToHtml('   ')).toBe('');
  });

  it('round-trips through htmlToMarkdown', () => {
    const md = 'First **bold**\nsecond\n\nThird [link](https://x.dev)';
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
  });
});

describe('markdownToHtml escaping', () => {
  it('keeps a quote in a link URL inside the href attribute', () => {
    const html = markdownToHtml('[x](https://a.b/"onmouseover="alert(1))');
    expect(html).not.toContain('"onmouseover="');
    expect(html).toBe(
      '<p><a href="https://a.b/&quot;onmouseover=&quot;alert(1">x</a>)</p>',
    );
  });

  it('escapes quotes in plain text', () => {
    expect(markdownToHtml('say "hi"')).toBe('<p>say &quot;hi&quot;</p>');
  });
});
