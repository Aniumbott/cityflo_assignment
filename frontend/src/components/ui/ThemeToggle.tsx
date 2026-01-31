import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../contexts/ThemeContext';

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light mode' },
  { value: 'dark', icon: Moon, label: 'Dark mode' },
  { value: 'system', icon: Monitor, label: 'System preference' },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex items-center bg-canvas dark:bg-midnight rounded-full p-1 gap-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          title={label}
          className={`p-1.5 rounded-full transition-colors ${
            mode === value
              ? 'bg-brand text-black'
              : 'text-slate dark:text-ash hover:text-ink dark:hover:text-cloud'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
