export interface FilterSet {
  dataInicio?: string;
  dataFim?: string;
  obras?: string[];
  analistas?: string[];
}

export const buildFilterStrings = (filters: FilterSet): string[] => {
  const r: string[] = [];

  if (filters.dataInicio && filters.dataFim) {
    r.push(`Período: ${filters.dataInicio} a ${filters.dataFim}`);
  } else {
    r.push('Período: não filtrado');
  }

  r.push(
    filters.obras?.length
      ? `Obras: ${filters.obras.join(', ')}`
      : 'Obras: TODAS'
  );

  r.push(
    filters.analistas?.length
      ? `Analistas: ${filters.analistas.join(', ')}`
      : 'Analistas: TODOS'
  );

  return r;
};
