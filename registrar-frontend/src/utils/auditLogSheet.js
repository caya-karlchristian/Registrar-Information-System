import XLSX from 'xlsx-js-style';

/**
 * Generates and downloads the official Institutional Audit Log Spreadsheet (.xlsx)
 * using xlsx-js-style (100% CSP compliant, no unsafe-eval).
 *
 * @param {Array} logs - List of audit log records
 * @param {Object} options - Filter & metadata options (dateRangeLabel, roleFilter, actionFilter, browserFilter, search)
 */
export const AuditLogSheet = async (logs = [], options = {}) => {
  const wb = XLSX.utils.book_new();

  const data = [];
  const merges = [];
  const rowHeights = [];

  // Helper to get cell address like "A1"
  const getCellRef = (r, c) => XLSX.utils.encode_cell({ r, c });

  // 1. Report Title (Row 0)
  const titleRowIndex = data.length;
  data.push(['SYSTEM AUDIT TRAIL AND ACTIVITY REPORT', '', '', '', '']);
  merges.push({ s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: 4 } });
  rowHeights.push({ hpt: 24 });

  // 2. Subtitle / Filter Metadata (Row 1)
  const subtitleText = `Total Records: ${logs.length}${
    options.dateRangeLabel ? `  |  Period: ${options.dateRangeLabel}` : ''
  }${
    options.roleFilter && options.roleFilter !== 'All' ? `  |  Role: ${options.roleFilter}` : ''
  }${
    options.actionFilter && options.actionFilter !== 'All' ? `  |  Action: ${options.actionFilter}` : ''
  }${
    options.browserFilter && options.browserFilter !== 'All' ? `  |  Browser: ${options.browserFilter}` : ''
  }`;

  const subRowIndex = data.length;
  data.push([subtitleText, '', '', '', '']);
  merges.push({ s: { r: subRowIndex, c: 0 }, e: { r: subRowIndex, c: 4 } });
  rowHeights.push({ hpt: 18 });

  // Blank spacing row (Row 2)
  data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 10 });

  // 3. Table Header Row (Row 3)
  const headerRowIndex = data.length;
  const tableHeaders = ['TIMESTAMP', 'USER ACCOUNT', 'ROLE', 'ACTION PERFORMED', 'BROWSER / PLATFORM'];
  data.push(tableHeaders);
  rowHeights.push({ hpt: 26 });

  // 4. Data Rows
  const dataStartRowIndex = data.length;
  if (!logs || logs.length === 0) {
    const emptyRowIndex = data.length;
    data.push(['No audit records match the selected filter criteria.', '', '', '', '']);
    merges.push({ s: { r: emptyRowIndex, c: 0 }, e: { r: emptyRowIndex, c: 4 } });
    rowHeights.push({ hpt: 24 });
  } else {
    logs.forEach((log) => {
      data.push([
        `${log.date || ''} ${log.time || ''}`.trim() || '—',
        log.user || '—',
        log.role ? String(log.role).toUpperCase() : '—',
        log.action || '—',
        log.browser || '—',
      ]);
      rowHeights.push({ hpt: 20 });
    });
  }

  // Blank spacing row before footer
  data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 10 });

  // 5. Footer & Data Privacy Disclaimer
  const footer1Index = data.length;
  data.push(['This document contains personal-identifiable information that is subject to Data Privacy.', '', '', '', '']);
  merges.push({ s: { r: footer1Index, c: 0 }, e: { r: footer1Index, c: 4 } });
  rowHeights.push({ hpt: 16 });

  const footer2Index = data.length;
  data.push(['This is system-generated from the Registrar Information System (RIS).', '', '', '', '']);
  merges.push({ s: { r: footer2Index, c: 0 }, e: { r: footer2Index, c: 4 } });
  rowHeights.push({ hpt: 16 });

  // Build Worksheet from 2D Array
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column definitions & base widths (5 columns: A to E)
  ws['!cols'] = [
    { wch: 24 }, // A: Timestamp
    { wch: 36 }, // B: User Account
    { wch: 20 }, // C: Role
    { wch: 28 }, // D: Action
    { wch: 26 }, // E: Browser
  ];
  ws['!merges'] = merges;
  ws['!rows'] = rowHeights;

  // ── Apply Styles ──────────────────────────────────────────────────────────

  // Title Style
  const titleCell = ws[getCellRef(titleRowIndex, 0)];
  if (titleCell) {
    titleCell.s = {
      font: { name: 'Lucida Fax', sz: 13, bold: true, color: { rgb: '7F0000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Subtitle Style
  const subCell = ws[getCellRef(subRowIndex, 0)];
  if (subCell) {
    subCell.s = {
      font: { name: 'Lucida Fax', sz: 9.5, italic: true, color: { rgb: '555555' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Header Row Styles
  const headerBorder = {
    top: { style: 'thin', color: { rgb: 'B0B0B0' } },
    bottom: { style: 'thin', color: { rgb: 'B0B0B0' } },
    left: { style: 'thin', color: { rgb: 'B0B0B0' } },
    right: { style: 'thin', color: { rgb: 'B0B0B0' } },
  };

  for (let c = 0; c < 5; c++) {
    const cell = ws[getCellRef(headerRowIndex, c)];
    if (cell) {
      cell.s = {
        fill: { fgColor: { rgb: '7F0000' } },
        font: { name: 'Lucida Fax', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: headerBorder,
      };
    }
  }

  // Data Rows Styles
  const dataBorder = {
    top: { style: 'thin', color: { rgb: 'E0E0E0' } },
    bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
    left: { style: 'thin', color: { rgb: 'E0E0E0' } },
    right: { style: 'thin', color: { rgb: 'E0E0E0' } },
  };

  if (!logs || logs.length === 0) {
    const emptyCell = ws[getCellRef(dataStartRowIndex, 0)];
    if (emptyCell) {
      emptyCell.s = {
        font: { name: 'Lucida Fax', sz: 10, italic: true, color: { rgb: '777777' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  } else {
    logs.forEach((_, idx) => {
      const r = dataStartRowIndex + idx;
      const isEven = idx % 2 === 1;

      for (let c = 0; c < 5; c++) {
        const cell = ws[getCellRef(r, c)];
        if (cell) {
          cell.s = {
            font: { name: 'Lucida Fax', sz: 9, color: { rgb: '1F1F1F' } },
            alignment: {
              vertical: 'center',
              horizontal: c === 1 ? 'left' : 'center',
            },
            border: dataBorder,
            ...(isEven ? { fill: { fgColor: { rgb: 'F9F9F9' } } } : {}),
          };
        }
      }
    });
  }

  // Footer 1 Style
  const footer1Cell = ws[getCellRef(footer1Index, 0)];
  if (footer1Cell) {
    footer1Cell.s = {
      font: { name: 'Lucida Fax', sz: 8, bold: true, color: { rgb: 'CC0000' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  // Footer 2 Style
  const footer2Cell = ws[getCellRef(footer2Index, 0)];
  if (footer2Cell) {
    footer2Cell.s = {
      font: { name: 'Lucida Fax', sz: 8, italic: true, color: { rgb: '666666' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  // Append Sheet to Workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

  // Trigger Download
  const year = new Date().getFullYear();
  const fileName = options.dateRangeLabel
    ? `Audit_Log_Report_${options.dateRangeLabel.replace(/[\s\/\\]/g, '_')}.xlsx`
    : `Audit_Log_Report_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
};

export default AuditLogSheet;
