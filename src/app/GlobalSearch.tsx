import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useGlobalScanner } from '@/lib/scanner';
import { useDebounced } from '@/lib/use-debounced';

/** Numbers-first search in the header. Also takes keyboard-mode barcode scans, from any screen. */
export function GlobalSearch({ onDone }: { onDone?: () => void } = {}) {
  const navigate = useNavigate();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = text.trim();
  const debounced = useDebounced(term, 250);
  const results = useQuery({
    queryKey: ['search', debounced],
    enabled: open && debounced.length >= 2,
    staleTime: 5_000,
    queryFn: async () => unwrap(await api.GET('/api/v1/search', { params: { query: { q: debounced } } })),
  });
  const items = debounced === term ? (results.data ?? []) : [];
  const searching = term.length >= 2 && (debounced !== term || results.isFetching);

  const go = (link: string) => {
    setOpen(false);
    setText('');
    setActive(-1);
    input.current?.blur();
    onDone?.();
    navigate(link);
  };

  const scan = async (code: string) => {
    try {
      const { link } = unwrap(await api.GET('/api/v1/search/scan', { params: { query: { code } } }));
      if (link) {
        go(link);
        return;
      }
      // Not an exact code: fall back to showing what a search finds.
      setText(code);
      setActive(-1);
      setOpen(true);
      input.current?.focus();
    } catch (e) {
      toastError(e);
    }
  };

  useGlobalScanner((code) => void scan(code));

  // Ctrl+K or Cmd+K from anywhere, and "/" when not typing, jump to search: the fastest way to any record.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) {
        if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const showList = open && term.length >= 2;
  return (
    <div className="relative max-w-md" onMouseDown={(e) => e.target !== input.current && e.preventDefault()}>
      <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-gray-500" aria-hidden />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search or scan"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-keyshortcuts="Control+K Meta+K /"
        placeholder="Search or scan a job, sample, report, invoice or customer"
        autoComplete="off"
        className="peer h-9 w-full truncate rounded-md border border-gray-300 bg-surface pr-2.5 pl-8 text-sm text-gray-900 transition-[border-color] duration-(--motion-fast) placeholder:text-gray-500 hover:border-gray-400 focus-visible:border-brand-focus md:pr-14 max-md:text-base pointer-coarse:h-11"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          if (!text.trim()) onDone?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            if (items.length) setActive((i) => (i + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            if (items.length) setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (showList && items[active]) go(items[active].link);
            else if (term) void scan(term);
          }
        }}
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute top-2 right-2 hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-px font-sans text-[11px] text-gray-600 md:block peer-focus:hidden"
      >
        {mac ? '⌘' : 'Ctrl'} K
      </kbd>
      <div
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!showList}
        className="absolute top-10 left-0 z-30 max-h-96 w-full min-w-72 animate-pop-in overflow-y-auto rounded-md border border-gray-200 bg-surface-raised py-1 shadow-lg"
      >
        {showList &&
          items.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] pointer-coarse:py-3', i === active ? 'bg-gray-100' : 'hover:bg-gray-50')}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.link)}
            >
              <Badge className="w-16 justify-center">{r.type}</Badge>
              <span className="truncate font-medium text-gray-900">{r.title}</span>
              {r.subtitle && <span className="ml-auto truncate pl-2 text-xs text-gray-600">{r.subtitle}</span>}
            </button>
          ))}
        {showList && !items.length && (
          <p role="status" className="px-2.5 py-2 text-[13px] text-gray-700">
            {results.error ? 'Search failed. Please try again.' : searching ? 'Searching…' : 'Nothing found'}
          </p>
        )}
      </div>
    </div>
  );
}
