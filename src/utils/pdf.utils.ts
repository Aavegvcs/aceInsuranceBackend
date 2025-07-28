import * as PDFDocument from 'pdfkit';

// Configuration for a field in the PDF
export interface FieldConfig {
    key: string; // Key in clientData
    label: string; // Display label in PDF
    format?: (value: string | undefined, clientData: { [key: string]: string | undefined }) => string; // Formatter with clientData
}

// Generate PDF content based on field configuration
export function generatePdfContent(
    doc: PDFDocument,
    clientData: { [key: string]: string | undefined },
    fieldConfig: FieldConfig[],
    templateId: string,
    conditionalFields?: (doc: PDFDocument, clientData: { [key: string]: string | undefined }) => void
): void {
    doc.fontSize(12).text(`Template ID: ${templateId}`);
    doc.moveDown();

    // Add fields from configuration
    fieldConfig.forEach(({ key, label, format }) => {
        const value = clientData[key];
        if (value !== undefined) {
            const displayValue = format ? format(value, clientData) : value;
            doc.text(`${label}: ${displayValue}`);
        }
    });

    // Add conditional fields (e.g., POA-related)
    if (conditionalFields) {
        conditionalFields(doc, clientData);
    }
}
