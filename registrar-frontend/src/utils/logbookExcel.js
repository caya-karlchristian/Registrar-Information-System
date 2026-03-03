import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import certificate_footer from '../assets/certificate_footer.png';

export const logbookExcel = async (filteredData, selectedDocLabel, pupLogoSrc, bpLogoSrc) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Logbook Records');

  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, 
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5, right: 0.5,
      top: 0.5, bottom: 0.5,
      header: 0, footer: 0,
    },
  };

  sheet.columns = [
    { width: 20 }, { width: 30 }, { width: 25 }, { width: 10 }, 
    { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, 
  ];

  const centerBold = (cell, value, size = 11) => {
    cell.value = value;
    cell.font = { bold: true, size, name: 'Arial' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  sheet.addRow([]); 
  sheet.addRow([]); 

  const addLogo = async (src, tl, br) => {
    try {
      const res = await fetch(src);
      const buffer = await res.arrayBuffer();
      const id = workbook.addImage({ buffer, extension: 'png' });
      sheet.addImage(id, { tl, br, editAs: 'oneCell' });
    } catch (e) { console.error("Logo failed to load", e); }
  };

  if (pupLogoSrc) await addLogo(pupLogoSrc, { col: 0.1, row: 0.5 }, { col: 1.0, row: 6.5 });
  if (bpLogoSrc) await addLogo(bpLogoSrc, { col: 7.0, row: 0.5 }, { col: 8.0, row: 6.5 });

  const headers = [
    { row: 2, text: 'REPUBLIC OF THE PHILIPPINES', font: { size: 9, name: 'Arial' } },
    { row: 3, text: 'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', font: { size: 12, name: 'Arial', color: { argb: 'FF800000' }, bold: true } },
    { row: 4, text: 'OFFICE OF THE VICE PRESIDENT FOR CAMPUSES', font: { size: 9, name: 'Arial' } },
    { row: 5, text: 'TAGUIG CAMPUS', font: { size: 12, name: 'Arial', bold: true } },
    { row: 6, text: 'Office of the Campus Registrar', font: { size: 10, name: 'Arial', color: { argb: 'FF555555' }, italic: true } },
  ];

  headers.forEach(({ row, text, font }) => {
    sheet.mergeCells(`B${row}:G${row}`);
    const cell = sheet.getCell(`B${row}`);
    cell.value = text;
    cell.font = font;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(row).height = 22;
  });

  sheet.mergeCells('A9:H9');
  sheet.getCell('A9').border = { bottom: { style: 'medium', color: { argb: 'FF800000' } } };
  sheet.getRow(9).height = 8;

  sheet.addRow([]); 
  sheet.mergeCells('A11:H11');
  centerBold(sheet.getCell('A11'), `Processing of Application for ${selectedDocLabel}`, 14);
  sheet.addRow([]); 

  const headerRow = sheet.addRow([
    'Date Requested', 'Client Name', 'Course/Year & Section',
    'Gender', 'Email Address/Contact', 'Date/Time Processed',
    'No. of Minutes Processed', 'Date Claimed',
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 40; 

  filteredData.forEach((row) => {
    const dataRow = sheet.addRow([
      row.requested_at ? new Date(row.requested_at).toLocaleDateString() : 'N/A',
      row.student_profile ? `${row.student_profile.first_name} ${row.student_profile.last_name}` : 'N/A',
      row.academic_record ? `${row.academic_record.course} ${row.academic_record.section || ''}` : 'N/A',
      row.student_profile?.gender || '---',
      row.student_profile?.email || '---',
      row.processed_at ? new Date(row.processed_at).toLocaleDateString() : '---',
      row.processing_minutes || '0',
      row.claimed_at ? new Date(row.claimed_at).toLocaleDateString() : 'Pending',
    ]);

    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle', indent: 1 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    dataRow.height = 25; 
  });

  sheet.addRow([]); 
  const dividerRowIndex = sheet.lastRow.number + 1;
  sheet.mergeCells(`A${dividerRowIndex}:H${dividerRowIndex}`);
  sheet.getCell(`A${dividerRowIndex}`).border = { top: { style: 'medium', color: { argb: 'FF800000' } } };
  sheet.getRow(dividerRowIndex).height = 12;

  const footerLines = [
    { text: 'General Santos Avenue, Lower Bicutan, Taguig City, Philippines 1632' },
    { text: 'Direct Line: (02) 8837 5858 to 60  |  Email: taguig@pup.edu.ph' },
    { text: 'Website: www.pup.edu.ph  |  Inquiries: https://bit.ly/PUPSINTA' },
    { text: "THE COUNTRY'S 1ST POLYTECHNIC", bold: true, color: { argb: 'FF800000' } },
  ];

  const footerStartRow = dividerRowIndex + 1;

  footerLines.forEach(({ text, bold = false, color = { argb: 'FF333333' } }, i) => {
    const r = footerStartRow + i;
    sheet.mergeCells(`A${r}:E${r}`);
    const cell = sheet.getCell(`A${r}`);
    cell.value = text;
    cell.font = { size: bold ? 11 : 10, name: 'Arial', bold, color };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    sheet.getRow(r).height = 28; 
  });

  try {
    const badgeRes = await fetch(certificate_footer);
    const badgeBuffer = await badgeRes.arrayBuffer();
    const badgeId = workbook.addImage({ buffer: badgeBuffer, extension: 'png' });

    sheet.addImage(badgeId, {
      tl: { col: 6.5, row: footerStartRow - 0.5 }, 
      br: { col: 8.0, row: footerStartRow + 3.5 }, 
      editAs: 'oneCell', 
    });
  } catch (err) { console.error("Footer badge failed", err); }

  const lastRowNumber = sheet.lastRow.number;
  sheet.pageSetup.printArea = `A1:H${lastRowNumber}`;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Logbook_${selectedDocLabel.replace(/\s+/g, '_')}.xlsx`);
};