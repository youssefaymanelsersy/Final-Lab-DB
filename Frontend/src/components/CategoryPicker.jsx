import { useMemo } from 'react';
import '../Styles/CategoryPicker.css';

export default function CategoryPicker({
  value,
  onChange,
  items,
  title = 'Featured Categories',
  rightLabel = 'All Genre',
  onRightClick,
}) {
  const safeItems = useMemo(() => {
    if (Array.isArray(items) && items.length) return items;
    return [
      { id: 'all', label: 'All' },
      { id: 'fiction', label: 'Fiction' },
      { id: 'nonfiction', label: 'Non-fiction' },
      { id: 'mystery', label: 'Mystery' },
      { id: 'scifi', label: 'Sci-Fi & Fantasy' },
    ];
  }, [items]);

  const active = value ?? safeItems[0]?.id;

  return (
    <div className="bnCats">
      <div className="bnCatsTop">
        <div>
          <div className="bnCatsTitle">{title}</div>
        </div>

        <button
          type="button"
          className="bnCatsLink"
          onClick={() => onRightClick?.()}
        >
          {rightLabel}
        </button>
      </div>

      <div className="bnCatsTabs" role="tablist" aria-label="Categories">
        {safeItems.map((it) => {
          const isActive = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={'bnCatTab' + (isActive ? ' active' : '')}
              onClick={() => onChange?.(it.id)}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
