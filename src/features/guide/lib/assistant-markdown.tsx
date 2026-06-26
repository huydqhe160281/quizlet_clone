import Link from 'next/link';
import type { ReactNode } from 'react';

type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'link'; label: string; href: string };

type Block =
  | { kind: 'paragraph'; inlines: InlineSegment[] }
  | { kind: 'ordered'; items: InlineSegment[][] }
  | { kind: 'bullet'; items: InlineSegment[][] };

const MARKDOWN_LINK = /\[([^\]]+)\]\(((?:[^()]|\([^)]*\))*)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;

function isSafeInternalHref(href: string): boolean {
  return (
    href.startsWith('/') && !href.includes('://') && !href.toLowerCase().startsWith('javascript:')
  );
}

export function parseInlineMarkdown(text: string): InlineSegment[] {
  const tokens: Array<{ index: number; length: number; segment: InlineSegment }> = [];

  for (const match of text.matchAll(MARKDOWN_LINK)) {
    const label = match[1] ?? '';
    const href = match[2] ?? '';
    tokens.push({
      index: match.index ?? 0,
      length: match[0].length,
      segment: isSafeInternalHref(href)
        ? { kind: 'link', label, href }
        : { kind: 'text', value: label },
    });
  }

  for (const match of text.matchAll(BOLD)) {
    const overlaps = tokens.some(
      (token) =>
        (match.index ?? 0) >= token.index && (match.index ?? 0) < token.index + token.length
    );
    if (overlaps) {
      continue;
    }
    tokens.push({
      index: match.index ?? 0,
      length: match[0].length,
      segment: { kind: 'bold', value: match[1] ?? '' },
    });
  }

  tokens.sort((a, b) => a.index - b.index);

  const segments: InlineSegment[] = [];
  let cursor = 0;

  for (const token of tokens) {
    if (token.index > cursor) {
      segments.push({ kind: 'text', value: text.slice(cursor, token.index) });
    }
    segments.push(token.segment);
    cursor = token.index + token.length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}

export function normalizeAssistantContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/([.!?])\s+(\d+\.\s)/g, '$1\n\n$2')
    .replace(/(\S)\s+(\d+\.\s+\*\*)/g, '$1\n\n$2')
    .replace(/(\S)\s+([-*]\s+\*\*)/g, '$1\n\n$2')
    .replace(/(^\d+\.\s.+)\n+(?=^\d+\.\s)/gm, '$1\n');
}

function coalesceListBlocks(blocks: Block[]): Block[] {
  const merged: Block[] = [];

  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (block.kind === 'ordered' && previous?.kind === 'ordered') {
      previous.items.push(...block.items);
      continue;
    }
    if (block.kind === 'bullet' && previous?.kind === 'bullet') {
      previous.items.push(...block.items);
      continue;
    }
    merged.push(block);
  }

  return merged;
}

export function parseAssistantMarkdown(content: string): Block[] {
  const lines = normalizeAssistantContent(content)
    .split('\n')
    .map((line) => line.trimEnd());

  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let ordered: string[] = [];
  let bullet: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push({
      kind: 'paragraph',
      inlines: parseInlineMarkdown(paragraph.join(' ')),
    });
    paragraph = [];
  };

  const flushOrdered = () => {
    if (ordered.length === 0) {
      return;
    }
    blocks.push({
      kind: 'ordered',
      items: ordered.map((line) => parseInlineMarkdown(line.replace(/^\d+\.\s*/, ''))),
    });
    ordered = [];
  };

  const flushBullet = () => {
    if (bullet.length === 0) {
      return;
    }
    blocks.push({
      kind: 'bullet',
      items: bullet.map((line) => parseInlineMarkdown(line.replace(/^[-*]\s+/, ''))),
    });
    bullet = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushOrdered();
    flushBullet();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      flushBullet();
      ordered.push(trimmed);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      flushOrdered();
      bullet.push(trimmed);
      continue;
    }

    flushOrdered();
    flushBullet();
    paragraph.push(trimmed);
  }

  flushAll();
  return coalesceListBlocks(blocks);
}

function renderInline(segments: InlineSegment[], keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    if (segment.kind === 'bold') {
      return (
        <strong key={key} className="font-semibold">
          {segment.value}
        </strong>
      );
    }
    if (segment.kind === 'link') {
      return (
        <Link
          key={key}
          href={segment.href}
          className="font-medium text-primary underline underline-offset-2"
        >
          {segment.label}
        </Link>
      );
    }
    return <span key={key}>{segment.value}</span>;
  });
}

export function AssistantMarkdown({ content }: { content: string }) {
  const blocks = parseAssistantMarkdown(content);

  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={blockIndex} className="text-sm">
              {renderInline(block.inlines, `p-${blockIndex}`)}
            </p>
          );
        }

        if (block.kind === 'ordered') {
          return (
            <ol key={blockIndex} className="list-none space-y-2 pl-0 text-sm">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                    {itemIndex + 1}.
                  </span>
                  <span className="min-w-0 flex-1">
                    {renderInline(item, `ol-${blockIndex}-${itemIndex}`)}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <ul key={blockIndex} className="list-disc space-y-1.5 pl-5 text-sm">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item, `ul-${blockIndex}-${itemIndex}`)}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
