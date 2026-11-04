import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const LABELS_TABELA: Record<string, string> = {
  excel_sla_familias: 'SLA por Família',
  excel_familias: 'Famílias',
  excel_insumos_prisma: 'Insumos Prisma',
  excel_familias_prisma: 'Famílias Prisma',
  excel_responsaveis_contratacao: 'Responsáveis de Contratação',
  excel_custo_obra: 'Custo por Obra',
};

interface Props {
  open: boolean;
  tabela: string;
  qtdAtual: number;
  qtdNova: number;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function DialogoConfirmacaoImport({
  open,
  tabela,
  qtdAtual,
  qtdNova,
  onConfirmar,
  onCancelar,
}: Props) {
  const labelAmigavel = LABELS_TABELA[tabela] ?? tabela;
  const isCustoObra = tabela === 'excel_custo_obra';

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Substituir todos os dados?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Você está prestes a <strong>SUBSTITUIR TODOS</strong> os dados da
                tabela <strong>"{labelAmigavel}"</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Linhas atuais que serão removidas: <strong>{qtdAtual}</strong></li>
                <li>Linhas que serão inseridas: <strong>{qtdNova}</strong></li>
              </ul>

              {isCustoObra && (
                <div
                  className="rounded-md border border-yellow-300 p-3 text-yellow-900"
                  style={{ backgroundColor: '#FEF3C7' }}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    ATENÇÃO ESPECIAL — Custo por Obra
                  </p>
                  <p className="mt-1">
                    Os campos <strong>CLIENTE</strong> e <strong>FOTO DA OBRA</strong> preenchidos
                    manualmente pelo painel serão <strong>PERDIDOS</strong> para todas as obras.
                    Você precisará preencher novamente após o import.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmar}
            style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
            className="hover:opacity-90"
          >
            Sim, substituir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
