import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generates and downloads the official Institutional Audit Log Spreadsheet (.xlsx)
 *
 * @param {Array} logs - List of audit log records
 * @param {Object} options - Filter & metadata options (dateRangeLabel, roleFilter, actionFilter, browserFilter, search)
 */
export const AuditLogSheet = async (logs = [], options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PUP Registrar Information System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Audit Logs', {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Set column definitions & base widths (5 columns: A to E)
  worksheet.columns = [
    { key: 'timestamp', width: 24 },
    { key: 'user', width: 36 },
    { key: 'role', width: 20 },
    { key: 'action', width: 28 },
    { key: 'browser', width: 26 },
  ];

  // 1. Report Title
  const titleRow = worksheet.addRow(['SYSTEM AUDIT TRAIL AND ACTIVITY REPORT']);
  worksheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.getCell(1).font = { name: 'Lucida Fax', size: 13, bold: true, color: { argb: 'FF7F0000' } };

  // Subtitle / Filter Metadata
  const subtitleText = `Total Records: ${logs.length}${
    options.dateRangeLabel ? `  |  Period: ${options.dateRangeLabel}` : ''
  }${
    options.roleFilter && options.roleFilter !== 'All' ? `  |  Role: ${options.roleFilter}` : ''
  }${
    options.actionFilter && options.actionFilter !== 'All' ? `  |  Action: ${options.actionFilter}` : ''
  }${
    options.browserFilter && options.browserFilter !== 'All' ? `  |  Browser: ${options.browserFilter}` : ''
  }`;

  const subRow = worksheet.addRow([subtitleText]);
  worksheet.mergeCells(`A${subRow.number}:E${subRow.number}`);
  subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  subRow.getCell(1).font = { name: 'Lucida Fax', size: 9.5, italic: true, color: { argb: 'FF555555' } };

  // Blank spacing row
  worksheet.addRow([]);

  // 3. Table Header Row (Maroon background, white bold text)
  const tableHeaders = ['TIMESTAMP', 'USER ACCOUNT', 'ROLE', 'ACTION PERFORMED', 'BROWSER / PLATFORM'];
  const tableHeaderRow = worksheet.addRow(tableHeaders);
  tableHeaderRow.height = 26;

  tableHeaderRow.eachCell((c) => {
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7F0000' }, // Maroon
    };
    c.font = {
      name: 'Lucida Fax',
      size: 9.5,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    };
  });

  // 4. Data Rows
  if (!logs || logs.length === 0) {
    const emptyRow = worksheet.addRow(['No audit records match the selected filter criteria.']);
    worksheet.mergeCells(`A${emptyRow.number}:E${emptyRow.number}`);
    emptyRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    emptyRow.getCell(1).font = { name: 'Lucida Fax', size: 10, italic: true, color: { argb: 'FF777777' } };
    emptyRow.height = 24;
  } else {
    logs.forEach((log, index) => {
      const dataRow = worksheet.addRow([
        `${log.date || ''} ${log.time || ''}`.trim() || '—',
        log.user || '—',
        log.role ? String(log.role).toUpperCase() : '—',
        log.action || '—',
        log.browser || '—',
      ]);
      dataRow.height = 20;

      const isEven = index % 2 === 1;
      dataRow.eachCell((c, colNumber) => {
        c.font = { name: 'Lucida Fax', size: 9, color: { argb: 'FF1F1F1F' } };
        c.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 2 ? 'left' : 'center',
        };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        if (isEven) {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' },
          };
        }
      });
    });
  }

  // 5. Footer & Data Privacy Disclaimer
  worksheet.addRow([]);
  const footerRow1 = worksheet.addRow(['This document contains personal-identifiable information that is subject to Data Privacy.']);
  worksheet.mergeCells(`A${footerRow1.number}:E${footerRow1.number}`);
  footerRow1.getCell(1).font = { name: 'Lucida Fax', size: 8, bold: true, color: { argb: 'FFCC0000' } };

  const footerRow2 = worksheet.addRow(['This is system-generated from the Registrar Information System (RIS).']);
  worksheet.mergeCells(`A${footerRow2.number}:E${footerRow2.number}`);
  footerRow2.getCell(1).font = { name: 'Lucida Fax', size: 8, italic: true, color: { argb: 'FF666666' } };

  // Write to buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const year = new Date().getFullYear();
  const fileName = options.dateRangeLabel
    ? `Audit_Log_Report_${options.dateRangeLabel.replace(/[\s\/\\]/g, '_')}.xlsx`
    : `Audit_Log_Report_${year}.xlsx`;

  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName
  );
};

export default AuditLogSheet;
