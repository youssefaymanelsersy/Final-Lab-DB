import { LayoutGrid, List } from 'lucide-react';
import '../Styles/ViewToggle.css';

export default function ViewToggle({ value, onChange }) {
  return (
    <div className="viewToggle">
      <button
        className={value === 'grid' ? 'active' : ''}
        onClick={() => onChange('grid')}
        aria-label="Grid view"
      >
        <LayoutGrid size={18} />
      </button>

      <button
        className={value === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        aria-label="List view"
      >
        <List size={18} />
      </button>
    </div>
  );
}
