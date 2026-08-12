import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export const exportToCSV = (data, filename = 'copycraft-report.csv') => {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, filename);
};

export const exportToPDF = (title, headers, rows, filename = 'copycraft-report.pdf') => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('CopyCraft Enterprise Platform', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  let y = 48;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(headers.join('   |   '), 14, y);

  doc.setFont('helvetica', 'normal');
  y += 6;

  rows.forEach((row, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(row.join('   |   '), 14, y);
    y += 8;
  });

  doc.save(filename);
};
