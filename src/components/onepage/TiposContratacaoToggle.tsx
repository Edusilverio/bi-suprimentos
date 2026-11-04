export type TipoContratacao = 'SUP' | 'PD' | 'AP';

export const TIPO_COLORS: Record<TipoContratacao, string> = {
  SUP: '#1E3A5F',
  PD:  '#5D7A9A',
  AP:  '#A8B5C4',
};

export const TIPO_LABELS: Record<TipoContratacao, string> = {
  SUP: 'SUP — Suprimentos',
  PD:  'PD — Pedido Direto',
  AP:  'AP — Acordo de Preço',
};

/** Mapeamento para purchase_order_type (vw_global_pedidos) */
export const TIPO_DB_VALUE: Record<TipoContratacao, string> = {
  SUP: 'Cotação',
  PD:  'Pedido Consumo',
  AP:  'Pedido Consumo - Corp',
};

export const TIPOS_DEFAULT: TipoContratacao[] = ['SUP', 'PD', 'AP'];

/**
 * Toggle exclusivo:
 * - estado inicial: todos ativos
 * - clica num botão: deixa só ele
 * - clica no único ativo: volta pra todos
 * - clica em outro com 1 ativo: troca pelo clicado
 */
export function toggleExclusivo(
  atuais: TipoContratacao[],
  clicado: TipoContratacao,
): TipoContratacao[] {
  if (atuais.length === 3) return [clicado];
  if (atuais.length === 1 && atuais[0] === clicado) return [...TIPOS_DEFAULT];
  return [clicado];
}

interface Props {
  ativos: TipoContratacao[];
  onToggle: (tipo: TipoContratacao) => void;
  compact?: boolean;
}

export function TiposContratacaoToggle({ ativos, onToggle, compact = false }: Props) {
  const tipos: TipoContratacao[] = ['SUP', 'PD', 'AP'];
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-center'}`}>
      {tipos.map((t) => {
        const ativo = ativos.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            title={TIPO_LABELS[t]}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm transition hover:scale-105 ${
              ativo
                ? 'bg-white border-gray-300'
                : 'bg-gray-100 border-gray-200 opacity-50'
            }`}
          >
            <span
              className="w-3 h-3 rounded-sm"
              style={{ background: ativo ? TIPO_COLORS[t] : '#CCCCCC' }}
            />
            {compact ? t : TIPO_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}
