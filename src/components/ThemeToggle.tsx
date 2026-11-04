import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  disabled?: boolean;
  title?: string;
}

export function ThemeToggle({ disabled = false, title }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const tooltip = title ?? (theme === 'dark' ? 'Modo claro' : 'Modo escuro');

  return (
    <button
      onClick={disabled ? undefined : toggleTheme}
      disabled={disabled}
      title={tooltip}
      className={`relative h-8 w-14 rounded-full bg-muted border border-border flex items-center px-1 transition-all duration-300 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      <span
        className={`absolute h-6 w-6 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-0' : 'translate-x-5'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="h-3.5 w-3.5 text-primary-foreground" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-primary-foreground" />
        )}
      </span>
    </button>
  );
}
