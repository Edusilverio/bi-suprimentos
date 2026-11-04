import { create } from 'zustand';

interface MacroFilter {
  page: string;
  statusKey: string;
  label: string;
}

interface FilterState {
  activePeriod: [Date, Date] | null;
  activeAnalistas: string[];
  activeTipos: string[];
  activeObras: string[];
  activeGruposMaterial: string[];
  activeMacroFilter: MacroFilter | null;
  setFilter: (field: 'activeAnalistas' | 'activeTipos' | 'activeObras' | 'activeGruposMaterial', value: string[]) => void;
  setPeriod: (period: [Date, Date] | null) => void;
  setMacroFilter: (page: string, statusKey: string, label: string) => void;
  clearMacroFilter: () => void;
  clearAllFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activePeriod: null,
  activeAnalistas: [],
  activeTipos: [],
  activeObras: [],
  activeGruposMaterial: [],
  activeMacroFilter: null,
  setFilter: (field, value) => set({ [field]: value }),
  setPeriod: (period) => set({ activePeriod: period }),
  setMacroFilter: (page, statusKey, label) => set({
    activeMacroFilter: { page, statusKey, label },
  }),
  clearMacroFilter: () => set({ activeMacroFilter: null }),
  clearAllFilters: () => set({
    activePeriod: null,
    activeAnalistas: [],
    activeTipos: [],
    activeObras: [],
    activeGruposMaterial: [],
    activeMacroFilter: null,
  }),
}));
