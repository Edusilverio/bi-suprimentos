import { Bug } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDebugStore } from '@/stores/useDebugStore';

export function DebugToggle() {
  const user = useAuthStore((s) => s.user);
  const { debugAtivo, toggleDebug } = useDebugStore();

  if (user?.nivel !== 0) return null;

  return (
    <button
      onClick={toggleDebug}
      title={debugAtivo ? 'Desativar modo debug' : 'Ativar modo debug'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${
        debugAtivo
          ? 'bg-yellow-400 text-gray-900 border-yellow-500'
          : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
      }`}
    >
      <Bug size={14} />
      {debugAtivo ? 'Debug ON' : 'Debug'}
    </button>
  );
}

export default DebugToggle;
