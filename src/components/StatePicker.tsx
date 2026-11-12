import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/primitives';
import { useGstStates } from '@/lib/autofill';
import { cn } from '@/lib/format';

/** States whose name or GST code matches what was typed: the start of a name first, then anywhere in it. */
export function filterStates<T extends { code: string; name: string }>(states: T[], typed: string): T[] {
  const q = typed.trim().toLowerCase();
  if (!q) return states;
  const starts = states.filter((s) => s.name.toLowerCase().startsWith(q) || s.code === q);
  const within = states.filter((s) => !starts.includes(s) && s.name.toLowerCase().includes(q));
  return [...starts, ...within];
}

/**
 * Searchable list of Indian states and union territories with their GST codes. Typing filters it (a name or a
 * two-digit code); choosing one sets both the name and the code.
 */
export function StatePicker({ id, value, onChange, invalid, disabled }: { id?: string; value: string; onChange: (name: string, code: string | null) => void; invalid?: boolean; disabled?: boolean }) {
  const states = useGstStates();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const items = useMemo(() => filterStates(states.data ?? [], text ?? ''), [states.data, text]);
  const pick = (s: { name: string; code: string }) => {
    onChange(s.name, s.code);
    setText(null);
    setOpen(false);
    setActive(-1);
  };
  const close = () => {
    // Typed a full name without choosing from the list: take it if it is a real state.
    if (text !== null) {
      const exact = (states.data ?? []).find((s) => s.name.toLowerCase() === text.trim().toLowerCase());
      if (exact) pick(exact);
      else if (!text.trim()) onChange('', null);
    }
    setText(null);
    setOpen(false);
  };
  return (
    <div className="relative" onMouseDown={(e) => (e.target as HTMLElement).tagName !== 'INPUT' && e.preventDefault()}>
      <Input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder="Choose or type a state"
        className="pr-8"
        value={text ?? value}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            if (items.length) setActive((i) => (i + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length) setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === 'Escape') {
            setText(null);
            setOpen(false);
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            const chosen = items[active] ?? (items.length === 1 ? items[0] : undefined);
            if (chosen) pick(chosen);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="absolute top-0 right-0 flex h-9 w-8 items-center justify-center text-gray-500"
        onClick={() => (open ? close() : (setOpen(true), input.current?.focus()))}
      >
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <div
        id={listId}
        role="listbox"
        aria-label="States"
        hidden={!open}
        className="absolute top-full left-0 z-30 mt-1 max-h-64 w-full min-w-56 overflow-y-auto rounded-md border border-gray-200 bg-surface py-1 shadow-lg"
      >
        {open &&
          items.map((s, i) => (
            <button
              key={s.code}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={s.name === value}
              tabIndex={-1}
              className={cn('flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[13px]', i === active ? 'bg-gray-100' : 'hover:bg-gray-50', s.name === value && 'font-medium')}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <span className="truncate text-gray-900">{s.name}</span>
              <span className="shrink-0 text-xs text-gray-600 tabular-nums">{s.code}</span>
            </button>
          ))}
        {open && !items.length && <p className="px-2.5 py-2 text-[13px] text-gray-700">{states.isLoading ? 'Loading…' : 'No state matches'}</p>}
      </div>
    </div>
  );
}
