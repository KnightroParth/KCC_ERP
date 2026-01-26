import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Professional PDF Generator for KCC ERP Inventory Module
 * Includes KCC branding, headers, footers, and clean table layouts
 */

// Helper to load image as base64 from URL
const loadImageAsBase64 = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      } catch (e) {
        console.warn('Failed to convert logo to base64:', e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.warn('Failed to load logo image');
      resolve(null);
    };
    
    // Handle different URL formats
    if (typeof imageUrl === 'string') {
      if (imageUrl.startsWith('data:')) {
        resolve(imageUrl); // Already base64
        return;
      }
      if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
        img.src = imageUrl;
      } else {
        img.src = `/${imageUrl}`;
      }
    } else {
      resolve(null);
    }
  });
};

// Try to get logo URL - will be set dynamically when needed
const getLogoUrl = () => {
  // Try to construct logo path - Vite handles assets
  try {
    // Use a relative path that Vite can resolve
    return '/src/style/images/logo.png';
  } catch (e) {
    return null;
  }
};

/**
 * Generate PDF with KCC branding
 * @param {Object} options - PDF generation options
 * @param {string} options.title - Document title
 * @param {string} options.subtitle - Document subtitle
 * @param {Array} options.columns - Table column definitions
 * @param {Array} options.data - Table data
 * @param {Object} options.meta - Additional metadata (project, date, etc.)
 * @param {string} options.filename - Output filename
 */
export const generateInventoryPDF = async ({
  title = 'Inventory Report',
  subtitle = '',
  columns = [],
  data = [],
  meta = {},
  filename = 'inventory-report.pdf',
}) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

  // Try to load logo
  let logoBase64 = null;
  const logoUrl = getLogoUrl();
  if (logoUrl) {
    try {
      logoBase64 = await loadImageAsBase64(logoUrl);
    } catch (e) {
      console.warn('Logo not found, continuing without logo');
    }
  }

  // Header with Logo
  const addHeader = () => {
    doc.setFillColor(10, 21, 40); // KCC Dark Blue
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Logo (if available)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 5, 30, 25);
      } catch (e) {
        // Logo failed, continue without it
      }
    }

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Kothari Construction Company', pageWidth - margin, 12, { align: 'right' });

    // Tagline
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Living... to Lifestyle!!!', pageWidth - margin, 18, { align: 'right' });

    // Document Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 28, { align: 'center' });

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, pageWidth / 2, 33, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPosition = 45;
  };

  // Footer
  const addFooter = (pageNumber, totalPages) => {
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `KCC ERP System | Generated on ${new Date().toLocaleDateString('en-IN')} | Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      footerY + 8,
      { align: 'center' }
    );
  };

  // Add metadata section
  const addMetadata = () => {
    if (Object.keys(meta).length === 0) return;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let metaY = yPosition;

    Object.entries(meta).forEach(([key, value]) => {
      if (value) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${key}:`, margin, metaY);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 40, metaY);
        metaY += 6;
      }
    });

    yPosition = metaY + 5;
  };

  // Generate table
  addHeader();
  addMetadata();

  // Prepare table data
  const tableColumns = columns.map(col => ({
    header: col.title || col.header || col.key,
    dataKey: col.dataIndex || col.key,
  }));

  const tableData = (data || []).map((row, rowIndex) => {
    try {
      return columns.map(col => {
        try {
          const key = col.dataIndex || col.key;
          if (!key) return 'N/A';
          
          if (col.render) {
            // For rendered columns, extract the actual value
            const value = row?.[key] || row?.[key.split('.')[0]];
            try {
              const rendered = col.render(value, row, rowIndex);
              // Extract text from React elements or return as-is
              if (rendered === null || rendered === undefined) return 'N/A';
              if (typeof rendered === 'object' && rendered?.props) {
                const children = rendered.props?.children;
                if (Array.isArray(children)) {
                  return children.map(c => String(c || '')).join(' ') || 'N/A';
                }
                return String(children || rendered || 'N/A');
              }
              return String(rendered || 'N/A');
            } catch (e) {
              console.warn('Error rendering column:', e);
              return 'N/A';
            }
          }
          
          // Handle nested objects
          if (key.includes('.')) {
            const keys = key.split('.');
            let val = row;
            for (const k of keys) {
              val = val?.[k];
              if (val === null || val === undefined) break;
            }
            return val !== null && val !== undefined ? String(val) : 'N/A';
          }
          
          // Handle object values (e.g., material.name)
          const cellValue = row?.[key];
          if (cellValue === null || cellValue === undefined) return 'N/A';
          if (typeof cellValue === 'object') {
            return cellValue?.name || cellValue?.projectCode || String(cellValue) || 'N/A';
          }
          return String(cellValue || 'N/A');
        } catch (e) {
          console.warn('Error processing column:', e);
          return 'N/A';
        }
      });
    } catch (e) {
      console.warn('Error processing row:', e);
      return columns.map(() => 'N/A');
    }
  });

  // Add table with error handling
  try {
    if (tableData.length === 0) {
      doc.setFontSize(10);
      doc.text('No data available', margin, yPosition + 10);
    } else {
      doc.autoTable({
        startY: yPosition,
        head: [tableColumns.map(col => col.header || 'N/A')],
        body: tableData,
        margin: { top: yPosition, left: margin, right: margin, bottom: 20 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [10, 21, 40], // KCC Dark Blue
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        didDrawPage: (data) => {
          try {
            // Add footer on each page
            const pageInfo = doc.internal.getNumberOfPages();
            addFooter(data.pageNumber, pageInfo);
          } catch (e) {
            console.warn('Error adding footer:', e);
          }
        },
      });
    }
  } catch (error) {
    console.error('Error generating table:', error);
    doc.setFontSize(10);
    doc.text('Error generating table data', margin, yPosition + 10);
  }

    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate Material Library PDF
 */
export const generateMaterialLibraryPDF = async (materials, filename = 'material-library.pdf') => {
  try {
    if (!Array.isArray(materials)) {
      throw new Error('Materials data must be an array');
    }
    
    const columns = [
      { title: 'Material Name', dataIndex: 'name', key: 'name' },
      { title: 'Category', dataIndex: 'category', key: 'category' },
      { title: 'Unit', dataIndex: 'uom', key: 'uom' },
      { title: 'Current Stock', dataIndex: 'currentStock', key: 'currentStock' },
      { title: 'Opening Stock', dataIndex: 'openingStock', key: 'openingStock' },
      { title: 'Specifications', dataIndex: 'specifications', key: 'specifications' },
    ];

    await generateInventoryPDF({
      title: 'Material Library',
      subtitle: 'Complete Material Catalog',
      columns,
      data: materials || [],
      filename,
    });
  } catch (error) {
    console.error('Error generating Material Library PDF:', error);
    throw new Error('Failed to generate Material Library PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate Purchase Order PDF
 */
export const generatePurchaseOrderPDF = async (po, filename = null) => {
  try {
    if (!po) {
      throw new Error('Purchase Order data is required');
    }
    
    if (!filename) {
      const year = po?.year || new Date().getFullYear();
      const number = po?.number || 0;
      filename = `PO-${year}-${String(number).padStart(4, '0')}.pdf`;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 15;

  // Try to load logo
  let logoBase64 = null;
  const logoUrl = getLogoUrl();
  if (logoUrl) {
    try {
      logoBase64 = await loadImageAsBase64(logoUrl);
    } catch (e) {
      console.warn('Logo not found');
    }
  }

  // Header
  doc.setFillColor(10, 21, 40);
  doc.rect(0, 0, pageWidth, 40, 'F');

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 5, 30, 30);
    } catch (e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  const poYear = po?.year || new Date().getFullYear();
  const poNumber = po?.number || 0;
  doc.text(`PO-${poYear}-${String(poNumber).padStart(4, '0')}`, pageWidth / 2, 28, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // PO Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Purchase Order Details', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const details = [
    ['PO Number:', `PO-${poYear}-${String(poNumber).padStart(4, '0')}`],
    ['Date:', po?.date ? new Date(po.date).toLocaleDateString('en-IN') : 'N/A'],
    ['Supplier:', po?.supplier?.name || 'N/A'],
    ['Status:', po?.status || 'Draft'],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Items Table
  if (po.items && Array.isArray(po.items) && po.items.length > 0) {
    const itemColumns = ['Material', 'Quantity', 'Unit', 'Rate', 'Amount'];
    const itemData = po.items.map(item => {
      try {
        return [
          item?.material?.name || 'N/A',
          ((item?.quantity || 0)).toFixed(2),
          item?.material?.uom || 'nos',
          `₹${((item?.rate || 0)).toFixed(2)}`,
          `₹${(((item?.quantity || 0) * (item?.rate || 0))).toFixed(2)}`,
        ];
      } catch (e) {
        return ['N/A', '0.00', 'nos', '₹0.00', '₹0.00'];
      }
    });

    doc.autoTable({
      startY: yPos,
      head: [itemColumns],
      body: itemData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: {
        fillColor: [10, 21, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const subTotal = po?.subTotal || 0;
  const taxRate = po?.taxRate || 0;
  const taxTotal = po?.taxTotal || 0;
  const totalAmount = po?.totalAmount || 0;
  
  doc.text(`Subtotal: ₹${subTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;
  doc.text(`Tax (${taxRate}%): ₹${taxTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;
  doc.setFontSize(12);
  doc.text(`Total: ₹${totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `KCC ERP System | Generated on ${new Date().toLocaleDateString('en-IN')}`,
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );

    doc.save(filename);
  } catch (error) {
    console.error('Error generating Purchase Order PDF:', error);
    throw new Error('Failed to generate Purchase Order PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate GRN PDF
 */
export const generateGRNPDF = async (grn, filename = null) => {
  try {
    if (!grn) {
      throw new Error('GRN data is required');
    }
    
    if (!filename) {
      const date = grn?.date ? new Date(grn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      filename = `GRN-${date}.pdf`;
    }

    const columns = [
      { title: 'Material', dataIndex: 'material', key: 'material' },
      { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Unit', dataIndex: 'unit', key: 'unit' },
      { title: 'Rate', dataIndex: 'rate', key: 'rate' },
    ];

    const meta = {
      'GRN Date': grn?.date ? new Date(grn.date).toLocaleDateString('en-IN') : 'N/A',
      'Project': grn?.projectId?.name || grn?.projectId?.projectCode || 'N/A',
      'PO Number': grn?.purchaseOrder?.number ? `PO-${grn.purchaseOrder.year || new Date().getFullYear()}-${String(grn.purchaseOrder.number).padStart(4, '0')}` : 'N/A',
      'Challan No': grn?.challanNo || 'N/A',
      'Invoice No': grn?.invoiceNo || 'N/A',
      'Storage Location': grn?.storageLocation || 'N/A',
    };

    // Transform items for PDF with error handling
    const items = (grn?.items || []).map(item => {
      try {
        return {
          material: item?.material?.name || 'N/A',
          quantity: ((item?.quantity || 0)).toFixed(2),
          unit: item?.unit || item?.material?.uom || 'nos',
          rate: `₹${((item?.rate || 0)).toFixed(2)}`,
        };
      } catch (e) {
        return {
          material: 'N/A',
          quantity: '0.00',
          unit: 'nos',
          rate: '₹0.00',
        };
      }
    });

    await generateInventoryPDF({
      title: 'Goods Receipt Note (GRN)',
      subtitle: 'Material Receipt Document',
      columns,
      data: items,
      meta,
      filename,
    });
  } catch (error) {
    console.error('Error generating GRN PDF:', error);
    throw new Error('Failed to generate GRN PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate Indent Request PDF
 */
export const generateIndentRequestPDF = async (indent, filename = null) => {
  try {
    if (!indent) {
      throw new Error('Indent Request data is required');
    }
    
    if (!filename) {
      filename = `Indent-${indent?._id || 'unknown'}.pdf`;
    }

    const columns = [
      { title: 'Material', dataIndex: 'material', key: 'material' },
      { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Unit', dataIndex: 'unit', key: 'unit' },
      { title: 'Notes', dataIndex: 'notes', key: 'notes' },
    ];

    const meta = {
      'Request Date': indent?.requestDate ? new Date(indent.requestDate).toLocaleDateString('en-IN') : 'N/A',
      'Required Date': indent?.requiredDate ? new Date(indent.requiredDate).toLocaleDateString('en-IN') : 'N/A',
      'Project': indent?.projectId?.name || indent?.projectId?.projectCode || 'N/A',
      'Priority': indent?.priority || 'N/A',
      'Status': indent?.status || 'N/A',
    };

    // Transform items for PDF with error handling
    const items = (indent?.items || []).map(item => {
      try {
        return {
          material: item?.material?.name || 'N/A',
          quantity: ((item?.quantity || 0)).toFixed(2),
          unit: item?.material?.uom || 'nos',
          notes: item?.notes || 'N/A',
        };
      } catch (e) {
        return {
          material: 'N/A',
          quantity: '0.00',
          unit: 'nos',
          notes: 'N/A',
        };
      }
    });

    await generateInventoryPDF({
      title: 'Material Requisition Note',
      subtitle: 'Indent Request',
      columns,
      data: items,
      meta,
      filename,
    });
  } catch (error) {
    console.error('Error generating Indent Request PDF:', error);
    throw new Error('Failed to generate Indent Request PDF: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate Consumption PDF
 */
export const generateConsumptionPDF = async (consumption, filename = null) => {
  try {
    if (!consumption) {
      throw new Error('Consumption data is required');
    }
    
    if (!filename) {
      const date = consumption?.date ? new Date(consumption.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      filename = `Consumption-${date}.pdf`;
    }

    const columns = [
      { title: 'Material', dataIndex: 'material', key: 'material' },
      { title: 'Quantity Used', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Unit', dataIndex: 'unit', key: 'unit' },
      { title: 'Activity', dataIndex: 'activity', key: 'activity' },
    ];

    const meta = {
      'Date': consumption?.date ? new Date(consumption.date).toLocaleDateString('en-IN') : 'N/A',
      'Project': consumption?.projectId?.name || consumption?.projectId?.projectCode || 'N/A',
      'Issued To': consumption?.issuedTo || 'N/A',
      'Work Activity': consumption?.workActivity || 'N/A',
    };

    // Transform items for PDF with error handling
    const items = (consumption?.items || []).map(item => {
      try {
        return {
          material: item?.material?.name || 'N/A',
          quantity: ((item?.quantity || 0)).toFixed(2),
          unit: item?.unit || item?.material?.uom || 'nos',
          activity: consumption?.workActivity || 'N/A',
        };
      } catch (e) {
        return {
          material: 'N/A',
          quantity: '0.00',
          unit: 'nos',
          activity: 'N/A',
        };
      }
    });

    await generateInventoryPDF({
      title: 'Material Consumption Report',
      subtitle: 'Stock Issue Document',
      columns,
      data: items,
      meta,
      filename,
    });
  } catch (error) {
    console.error('Error generating Consumption PDF:', error);
    throw new Error('Failed to generate Consumption PDF: ' + (error.message || 'Unknown error'));
  }
};
