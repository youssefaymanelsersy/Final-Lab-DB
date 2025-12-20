import { useEffect, useMemo, useRef, useState } from 'react';
import '../Styles/SearchOverlay.css';
import { Search, X, Sparkles, ArrowRight, MapPin, Gift } from 'lucide-react';

export default function SearchOverlay({
  trendingItems,
  newInItems,
  quickActions,
  shortcutHint = '⌘K',
  placeholder = 'What are you looking for?',
  onPick,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const trending = useMemo(
    () =>
      trendingItems ?? ['Science', 'History', 'Religion', 'Geography', 'Art'],
    [trendingItems]
  );

  const newIn = useMemo(
    () => newInItems ?? ['Books', 'Customers', 'Orders', 'Settings'],
    [newInItems]
  );

  const quick = useMemo(
    () =>
      quickActions ?? [
        { icon: MapPin, label: 'Store Locator' },
        { icon: Gift, label: 'Find the perfect gift' },
        { icon: Sparkles, label: 'Personalized picks' },
      ],
    [quickActions]
  );

  const close = () => setOpen(false);

  const openAndFocus = () => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Global shortcuts + escape + click outside
  useEffect(() => {
    const onKeyDown = (e) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openAndFocus();
        return;
      }
      // "/" opens like many dashboards (only if not typing)
      if (!open && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          openAndFocus();
        }
        return;
      }
      if (open && e.key === 'Escape') close();
    };

    const onMouseDown = (e) => {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) close();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const filteredTrending = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return trending;
    return trending.filter((t) => t.toLowerCase().includes(s));
  }, [q, trending]);

  const filteredNewIn = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return newIn;
    return newIn.filter((t) => t.toLowerCase().includes(s));
  }, [q, newIn]);

  const pick = (value) => {
    onPick?.(value);
    close();
  };

  return (
    <div className="searchWrap">
      {/* Compact top bar (the clickable pill) */}
      <div className="searchTop">
        <div className="searchChip" title="Search">
          <Search size={18} />
        </div>

        <button className="searchBar" type="button" onClick={openAndFocus}>
          <span className="searchPlaceholder">{placeholder}</span>
          <span className="searchHint">{shortcutHint}</span>
        </button>
      </div>

      {/* Backdrop */}
      {open && <div className="searchBackdrop" />}

      {/* Panel */}
      <div
        ref={panelRef}
        className={'searchPanel ' + (open ? 'open' : '')}
        aria-hidden={!open}
      >
        <div className="searchPanelHead">
          <div className="searchInputWrap">
            <Search size={18} className="searchInputIcon" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="searchInput"
              onFocus={() => setOpen(true)}
            />
            {q && (
              <button
                className="searchClear"
                type="button"
                onClick={() => setQ('')}
                title="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button className="searchCancel" type="button" onClick={close}>
            Cancel
          </button>
        </div>

        <div className="searchGrid">
          <div className="searchCol">
            <div className="searchTitle">Trending searches</div>
            <div className="searchList">
              {filteredTrending.map((t) => (
                <button
                  key={t}
                  className="searchItem"
                  type="button"
                  onClick={() => pick(t)}
                >
                  <span className="dot" />
                  <span className="label">{t}</span>
                  <ArrowRight size={16} className="arrow" />
                </button>
              ))}
              {!filteredTrending.length && (
                <div className="searchEmpty">No matches</div>
              )}
            </div>
          </div>

          <div className="searchCol">
            <div className="searchTitle">New in</div>
            <div className="searchList">
              {filteredNewIn.map((t) => (
                <button
                  key={t}
                  className="searchItem compact"
                  type="button"
                  onClick={() => pick(t)}
                >
                  <span className="label">{t}</span>
                  <ArrowRight size={16} className="arrow" />
                </button>
              ))}
              {!filteredNewIn.length && (
                <div className="searchEmpty">No matches</div>
              )}
            </div>
          </div>

          <div className="searchCol">
            <div className="searchTitle">Quick actions</div>
            <div className="searchCards">
              {quick.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="searchCard"
                  type="button"
                  onClick={() => pick(label)}
                >
                  <div className="searchCardIcon">
                    <Icon size={18} />
                  </div>
                  <div className="searchCardText">
                    <div className="searchCardLabel">{label}</div>
                    <div className="searchCardSub">Open</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="searchFooter">
          <span>Tip:</span> Press <kbd>Esc</kbd> to close • Press <kbd>/</kbd>{' '}
          to open
        </div>
      </div>
    </div>
  );
}
