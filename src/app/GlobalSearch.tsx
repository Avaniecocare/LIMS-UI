import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/primitives';
import { api, unwrap } from '@/lib/api';
import { cn } from '@/lib/format';
import { toastError } from '@/lib/forms';
import { useGlobalScanner } from '@/lib/scanner';
import { useDebounced } from '@/lib/use-debounced';

/** Numbers-first search in the header. Also takes keyboard-mode barcode scans, from any screen. */
export function GlobalSearch() {
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
        placeholder="Search or scan a job, sample, report, invoice or customer"
        autoComplete="off"
        className="h-9 w-full truncate rounded-md border border-gray-300 bg-white pr-2.5 pl-8 text-sm text-gray-900 placeholder:text-gray-500"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
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
      <div id={listId} role="listbox" aria-label="Search results" hidden={!showList} className="absolute top-10 left-0 z-30 max-h-96 w-full min-w-72 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
        {showList &&
          items.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px]', i === active ? 'bg-gray-100' : 'hover:bg-gray-50')}
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
