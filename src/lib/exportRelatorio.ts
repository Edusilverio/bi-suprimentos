import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportRelatorioOptions {
  /** Rota interna do relatório (será aberta em iframe oculto) */
  rota: string;
  /** Query params extras anexados à rota */
  queryParams?: Record<string, string | undefined>;
  /** Nome do arquivo final */
  filename: string;
  /** Seletores capturados em ordem; cada bloco é tratado individualmente para paginação */
  blocos: string[];
  /** Largura do iframe (px). Default 820. */
  iframeWidthPx?: number;
  /** Altura do iframe (px). Default 2400. */
  iframeHeightPx?: number;
  /** Tempo de espera após onload para garantir queries (ms). Default 3500. */
  readyDelayMs?: number;
  /** Timeout máximo esperando o relatório ficar pronto (ms). Default 45000. */
  maxWaitMs?: number;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const FOOTER_H = 18;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const USABLE_H = PAGE_H - MARGIN - FOOTER_H;

async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportarRelatorio(opts: ExportRelatorioOptions): Promise<void> {
  const {
    rota,
    queryParams = {},
    filename,
    blocos,
    iframeWidthPx = 820,
    iframeHeightPx = 2400,
    readyDelayMs = 3500,
    maxWaitMs = 45000,
  } = opts;
  void readyDelayMs;

  const SELOS_BASE = '/relatorio-assets';
  const [pbqpLogo, isoLogo] = await Promise.all([
    toDataURL(`${SELOS_BASE}/logo-pbqp-h.png`),
    toDataURL(`${SELOS_BASE}/logo-iso-9001.png`),
  ]);

  const renderRodape = (pdf: jsPDF) => {
    const rodapeY = PAGE_H - 14;
    pdf.setDrawColor(251, 43, 103);
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN, rodapeY - 4, PAGE_W - MARGIN, rodapeY - 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(
      'Atlas Engenharia — CNPJ 74.613.958/0001-94 © 2026 — Todos os direitos reservados.',
      MARGIN, rodapeY
    );

    const logoH = 9;
    const logoY = rodapeY - 7;
    const logoPbqpW = 18;
    const logoIsoW = 16;
    const gap = 3;
    const pbqpX = PAGE_W - MARGIN - logoIsoW - gap - logoPbqpW;
    const isoX = PAGE_W - MARGIN - logoIsoW;

    if (pbqpLogo || isoLogo) {
      try {
        if (pbqpLogo) pdf.addImage(pbqpLogo, 'PNG', pbqpX, logoY, logoPbqpW, logoH);
        if (isoLogo) pdf.addImage(isoLogo, 'PNG', isoX, logoY, logoIsoW, logoH);
      } catch {
        pdf.text('PBQP-H · ISO 9001', PAGE_W - MARGIN, rodapeY, { align: 'right' });
      }
    }
  };

  const qs = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${rota}${qs ? `?${qs}` : ''}`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${iframeWidthPx}px`;
  iframe.style.height = `${iframeHeightPx}px`;
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.onload = () => {
      const inicio = Date.now();
      const verificar = () => {
        const pronto =
          iframe.contentDocument?.documentElement?.dataset?.relatorioReady === '1';
        if (pronto || Date.now() - inicio > maxWaitMs) {
          setTimeout(resolve, 600);
          return;
        }
        setTimeout(verificar, 200);
      };
      verificar();
    };
  });

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  let currentY = MARGIN;

  for (const seletor of blocos) {
    const elems = Array.from(doc.querySelectorAll(seletor)) as HTMLElement[];
    for (const elem of elems) {
      const canvas = await html2canvas(elem, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const hMM = (canvas.height * CONTENT_W) / canvas.width;

      if (currentY + hMM > USABLE_H && currentY > MARGIN) {
        renderRodape(pdf);
        pdf.addPage();
        currentY = MARGIN;
      }

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', MARGIN, currentY, CONTENT_W, hMM);
      currentY += hMM + 4;
    }
  }

  renderRodape(pdf);
  pdf.save(filename);
  document.body.removeChild(iframe);
}
