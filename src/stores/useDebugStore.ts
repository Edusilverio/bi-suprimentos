import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DebugStore {
  debugAtivo: boolean;
  toggleDebug: () => void;
  setDebug: (v: boolean) => void;
}

export const useDebugStore = create<DebugStore>()(
  persist(
    (set) => ({
      debugAtivo: false,
      toggleDebug: () => set((s) => ({ debugAtivo: !s.debugAtivo })),
      setDebug: (v) => set({ debugAtivo: v }),
    }),
    { name: 'bi-debug-mode' }
  )
);
