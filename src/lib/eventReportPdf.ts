/**
 * Render del informe de eventos a PDF descargable (jsPDF + autotable).
 * Import dinámico: la librería solo entra en el bundle al pulsar "Informe PDF".
 * El contenido viene del modelo puro (lib/eventReport.ts).
 */

import type { EventReportModel } from './eventReport';

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = '#1f2328';
const MUTED = '#59636e';
const RULE = '#d1d5db';
const WARN = '#9a6700';

export async function downloadEventReportPdf(model: EventReportModel): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = MARGIN;

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const paragraphs = (texts: string[], size: number, color = INK, gap = 4) => {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setFont('helvetica', 'normal');
    for (const text of texts) {
      const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
      ensure(lines.length * (size + 2.5) + gap);
      doc.text(lines, MARGIN, y);
      y += lines.length * (size + 2.5) + gap;
    }
  };

  const sectionTitle = (text: string) => {
    ensure(30);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(INK);
    doc.text(text, MARGIN, y);
    y += 4;
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 12;
  };

  // ── cabecera ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(INK);
  doc.text(model.title, MARGIN, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  for (const line of model.metaLines) {
    doc.text(line, MARGIN, y);
    y += 11;
  }
  doc.setTextColor(WARN);
  doc.setFontSize(7.5);
  doc.text(model.classification, MARGIN, y + 2);
  y += 10;
  doc.setDrawColor(INK);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── 1. resumen ejecutivo ────────────────────────────────────────────────
  sectionTitle('1. Resumen ejecutivo');
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [model.kpis.map((kpi) => kpi.k)],
    body: [model.kpis.map((kpi) => kpi.v)],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, textColor: INK, lineColor: RULE },
    headStyles: { fillColor: '#f0f2f5', textColor: MUTED, fontSize: 6.5, fontStyle: 'bold' },
    bodyStyles: { font: 'courier', fontStyle: 'bold' },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  paragraphs(model.executive, 9);

  // ── 2. inventario ───────────────────────────────────────────────────────
  sectionTitle(`2. Inventario de episodios (${model.inventoryRows.length})`);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [model.inventoryHead],
    body: model.inventoryRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: INK, lineColor: RULE },
    headStyles: { fillColor: '#f0f2f5', textColor: MUTED, fontSize: 7, fontStyle: 'bold' },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // ── 3. fichas ───────────────────────────────────────────────────────────
  sectionTitle('3. Fichas de episodio');
  for (const sheet of model.sheets) {
    ensure(90);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(INK);
    doc.text(`${sheet.title}  —  ${sheet.level}`, MARGIN, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      body: sheet.rows.map((r) => [r.k, r.v]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2, textColor: INK },
      columnStyles: {
        0: { cellWidth: 150, textColor: MUTED, fontStyle: 'bold' },
        1: { font: 'courier' },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    ensure(12);
    doc.text('SENSORES INVOLUCRADOS', MARGIN, y);
    y += 9;
    paragraphs(sheet.sensores.map((s) => `•  ${s}`), 8, INK, 1.5);

    if (sheet.resumen.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(MUTED);
      ensure(12);
      doc.text('RESUMEN (FLUVIA · DESCRIPTIVO, SIN CONCLUSIÓN DE CAUSAS)', MARGIN, y);
      y += 9;
      paragraphs(sheet.resumen, 8.5, INK, 3);
    }

    if (sheet.notas.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(MUTED);
      ensure(12);
      doc.text('ANOTACIONES', MARGIN, y);
      y += 9;
      paragraphs(sheet.notas.map((n) => `•  ${n}`), 8, INK, 2);
    }

    y += 4;
    ensure(8);
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 12;
  }

  // ── 4. metodología ──────────────────────────────────────────────────────
  sectionTitle('4. Metodología y alcance');
  paragraphs(model.methodology.map((m) => `•  ${m}`), 8.5, INK, 4);

  // ── pies de página ──────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    doc.text(model.footer, MARGIN, PAGE_H - 24);
    doc.text(`pág. ${i} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' });
  }

  doc.save(model.filename);
}
