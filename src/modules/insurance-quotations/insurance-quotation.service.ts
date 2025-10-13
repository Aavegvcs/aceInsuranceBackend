import * as path from 'path';
import { Injectable } from '@nestjs/common';
// import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
const PDFDocument = require('pdfkit');
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { EmailService } from '@modules/email/email.service';
import { InsuranceQuotation } from './entities/insurance-quotation.entity';
import { User } from '@modules/user/user.entity';
import axios from 'axios';
import {
    addDays,
    addHours,
    Current_Step,
    formatToCamelCase,
    generateQuoteId,
    Insurance_Type,
    Quotation_Status,
    TICKET_LOG_EVENTS,
    Ticket_Status
} from 'src/utils/app.utils';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { QuoteEntity } from './entities/quote.entity';
import { CommonQuotationService } from './common-quotation.service';
import { Type } from 'class-transformer';
import { features } from 'process';
import { TicketNotificationService } from '@modules/insurance-escalation/ticket-notification-service';
import jsPDF from 'jspdf';
import autoTable, { jsPDFDocument } from 'jspdf-autotable';
import { ProductFeatures } from '@modules/insurance-features/entities/product-features.entity';
import { getAssetPath } from 'src/utils/images-path-utils';
import { InsuranceFeatures } from '@modules/insurance-features/entities/insurance-features.entity';
const today = new Date();
const formattedDate = today.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short', // gives "Sep"
    year: 'numeric'
});
@Injectable()
export class InsuranceQuotationService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(InsuranceCompanies)
        private readonly insCompanyRepo: Repository<InsuranceCompanies>,

        @InjectRepository(InsuranceProduct)
        private productRepo: Repository<InsuranceProduct>,

        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,

        @InjectRepository(InsuranceQuotation)
        private quotationRepository: Repository<InsuranceQuotation>,

        @InjectRepository(QuoteEntity)
        private quotesRepo: Repository<QuoteEntity>,

        @InjectRepository(ProductFeatures)
        private productFeaturesRepo: Repository<ProductFeatures>,

        @InjectRepository(InsuranceFeatures)
        private insurncetFeaturesRepo: Repository<InsuranceFeatures>,

        private readonly emailService: EmailService,
        private readonly quotationService: CommonQuotationService,
        private readonly ticketNotiService: TicketNotificationService
    ) {}

    async generateQuotationPDF(ticket: any, quotationId: string): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const colors = {
                    primary: '#1F2937',
                    accent: '#3B82F6',
                    lightAccent: '#EFF6FF',
                    border: '#E5E7EB',
                    text: '#374151',
                    lightText: '#6B7280',
                    success: '#10B981',
                    background: '#FFFFFF',
                    error: '#FF2C2C'
                };
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                 // === Include Logo ===
                const logoPath = fs.existsSync(path.resolve(__dirname, 'assets/images/ACUMEN-BLUE-LOGO.PNG'))
                    ? path.resolve(__dirname, 'assets/images/ACUMEN-BLUE-LOGO.PNG') // for build / Docker
                    : path.resolve(__dirname, '../../assets/images/ACUMEN-BLUE-LOGO.PNG'); // for dev

                console.log('Resolved logo path:', logoPath);
                console.log('Exists?', fs.existsSync(logoPath));
                // === Watermark logic ===
                const watermarksPath = fs.existsSync(path.resolve(__dirname, 'assets/images/logo-accumen.png'))
                    ? path.resolve(__dirname, 'assets/images/logo-accumen.png') // for build / Docker
                    : path.resolve(__dirname, '../../assets/images/logo-accumen.png'); // for dev

                    console.log('watermarksPath logo path:', watermarksPath);
                console.log('Exists?', fs.existsSync(watermarksPath));

                const locationPath = fs.existsSync(path.resolve(__dirname, 'assets/images/placeholder.png'))
                    ? path.resolve(__dirname, 'assets/images/placeholder.png') // for build / Docker
                    : path.resolve(__dirname, '../../assets/images/placeholder.png'); // for dev
  console.log('placeholder logo path:', locationPath);
                console.log('Exists?', fs.existsSync(locationPath));
                const phonePath = fs.existsSync(path.resolve(__dirname, 'assets/images/phone.png'))
                    ? path.resolve(__dirname, 'assets/images/phone.png') // for build / Docker
                    : path.resolve(__dirname, '../../assets/images/phone.png'); // for dev

                function addWatermark() {
                    const pageWidth = doc.page.width;
                    const pageHeight = doc.page.height;

                    // Logo size (adjust as needed)
                    const logoWidth = 200;
                    const logoHeight = 100;

                    // Center position
                    const x = (pageWidth - logoWidth) / 2;
                    const y = (pageHeight - logoHeight) / 2;

                    doc.opacity(0.1); // very faint watermark
                    doc.image(watermarksPath, x, y, { width: logoWidth, height: logoHeight });
                    doc.opacity(1); // reset opacity for normal content
                }
                // Add watermark to first page
                addWatermark();

                // Automatically add watermark on every new page
                doc.on('pageAdded', () => {
                    addWatermark();
                });

                const fontPath = path.join(__dirname, '../../assets/fonts/DejaVuSans.ttf');
                const boldFontPath = path.join(__dirname, '../../assets/fonts/DejaVuSans-Bold.ttf');
                const NotoSans = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
                doc.registerFont('DejaVuSans', fontPath);
                doc.registerFont('DejaVuSans-Bold', boldFontPath);
                doc.registerFont('NotoSans-Regular', NotoSans);
                doc.font('DejaVuSans');

                const buffers: Buffer[] = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                const quotation = await this.quotationRepository.findOneOrFail({
                    where: {
                        id: parseInt(quotationId),
                        ticketId: { id: parseInt(ticket.id) }
                    },
                    relations: [
                        'quotes',
                        'quotes.company',
                        'quotes.product',
                        'quotes.quoteFeatures',
                        'quotes.quoteFeatures.insuranceFeatures'
                    ]
                });

                const ticketDetails = await this.quotationService.getTicketDetails(ticket);

                const data = {
                    customerName: ticketDetails.data.insuranceUser.name,
                    insuranceType: ticketDetails.data.insuranceType,
                    ticketNumber: ticketDetails.data.ticketNumber,
                    proposer: {
                        name: ticketDetails.data.insuranceUser.name,
                        dob: ticketDetails.data.insuranceUser.dateOfBirth?.toString().split('T')[0] || 'N/A',
                        gender: formatToCamelCase(ticketDetails.data.insuranceUser.gender) || 'N/A',
                        height: ticketDetails.data.medicalDetails
                            ? ticketDetails.data.medicalDetails.height || 0
                            : null,
                        weight: ticketDetails.data.medicalDetails ? ticketDetails.data.medicalDetails.weight || 0 : null
                    },

                    vehicleDetails: ticketDetails?.data?.vehicleDetails
                        ? {
                              vehicleNumber: ticketDetails.data.vehicleDetails?.vehicleNumber || 'N/A',
                              rcOwnerName: ticketDetails.data.vehicleDetails?.rcOwnerName || 'N/A',
                              engineNumber: ticketDetails.data.vehicleDetails?.engineNumber || 'N/A',
                              chassisNumber: ticketDetails.data.vehicleDetails?.chassisNumber || 'N/A',
                              dateOfReg: ticketDetails.data.vehicleDetails?.dateOfReg || 'N/A',
                              modelNumber: ticketDetails.data.vehicleDetails?.modelNumber || 'N/A',
                              makingYear: ticketDetails.data.vehicleDetails?.makingYear || 'N/A',
                              madeBy: ticketDetails.data.vehicleDetails?.madeBy || 'N/A',
                              vehicleCategory: ticketDetails.data.vehicleDetails?.vehicleCategory || 'N/A'
                          }
                        : null,
                    dependentDetails: ticketDetails.data.dependents
                        ? ticketDetails.data.dependents?.map((dependent) => ({
                              name: dependent?.name,
                              dob: dependent?.dateOfBirth?.toString().split('T')[0] || 'N/A',
                              gender: formatToCamelCase(dependent?.gender) || 'N/A',
                              height: dependent?.medicalDetails?.height || 0,
                              weight: dependent?.medicalDetails?.weight || 0
                          }))
                        : null,
                    insuredPersons: ticketDetails.data.insuredPersons
                        ? {
                              name: ticketDetails.data.insuredPersons?.name || '-',
                              dob: ticketDetails.data.insuredPersons?.dateOfBirth?.toString().split('T')[0] || 'N/A',
                              gender: formatToCamelCase(ticketDetails?.data?.insuredPersons?.gender ?? '') || 'N/A',
                              height: ticketDetails?.data?.insuredPersons?.height || 0,
                              weight: ticketDetails.data.insuredPersons?.weight || 0
                          }
                        : null,
                    pinCode: ticketDetails.data.insuranceUser.pinCode || 'N/A',
                    mobileNo: ticketDetails.data.insuranceUser.primaryContactNumber || 'N/A',
                    emailId: ticketDetails.data.insuranceUser.emailId || 'N/A',
                    pedDeclared: ticketDetails.data.medicalDetails
                        ? formatToCamelCase(ticketDetails.data.medicalDetails.preExistDiseases) || 'N/A'
                        : null,
                    quotes: quotation.quotes.map((quote) => ({
                        companyLogo: quote.company.companyLogo,
                        companyName: quote.company.companyName,
                        productName: quote.product.name,
                        coverage: quote.coveragedRequired || 0,
                        premium: quote.Premium || 0,
                        features: quote.features || 'N/A',
                        benefits: quote.benefits || 'N/A',
                        advantages: quote.advantages || 'N/A',
                        remarks: quote.additionalRemarks || 'N/A',
                        idv: quote.idv || 'N/A',
                        coverType: formatToCamelCase(quote.coverageType) || 'N/A',
                        coverageIncluded: quote.coverageIncluded || 'N/A',
                        ncb: quote.ncb || 'N/A'
                    })),

                    validityDate: quotation.validityDate.toISOString().split('T')[0],
                    branch: {
                        name: ticketDetails.data?.branch?.ContactPerson,
                        contact: ticketDetails.data?.branch?.phone,
                        address: ticketDetails.data?.branch?.address
                    }
                };

                // Step 1: Collect all features across products
                // const allFeaturesSet = new Set<string>();
                // for (const quote of quotation.quotes) {
                //     const productFeatures = await this.productFeaturesRepo.find({
                //         where: { product: { id: quote.product.id }, isActive: true },
                //         relations: ['insuranceFeatures']
                //     });

                //     productFeatures.forEach((f) => allFeaturesSet.add(f.insuranceFeatures.featuresName));
                // }

                const insuranceFeatures = await this.insurncetFeaturesRepo.find({
                    where: { isActive: true, insuranceType: ticket.insuranceType }
                });

                const basicFeatures: InsuranceFeatures[] = [];
                const addOnFeatures: InsuranceFeatures[] = [];

                // Separate based on isStandard
                insuranceFeatures.forEach((feature) => {
                    if (feature.isStandard) {
                        basicFeatures.push(feature);
                    } else {
                        addOnFeatures.push(feature);
                    }
                });

                // Split into basic and add-on based on name containing 'Cover' (assumption for categorization)
                // const basicFeatures = allFeatures.filter((f) => !f.toLowerCase().includes('cover'));
                // const addOnFeatures = allFeatures.filter((f) => f.toLowerCase().includes('cover'));

                // Prepare final comparison data for basic
                const finalBasicData: { feature: string; quoteValues: string[] }[] = basicFeatures.map((feature) => {
                    return {
                        feature: feature.featuresName,
                        quoteValues: quotation.quotes.map((quote) => {
                            const includedFeatures = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
                            return includedFeatures.includes(feature.id) ? '✓' : '×';
                        })
                    };
                });

                // Prepare final comparison data for add-on
                const finalAddOnData: { feature: string; quoteValues: string[] }[] = addOnFeatures.map((feature) => {
                    return {
                        feature: feature.featuresName,
                        quoteValues: quotation.quotes.map((quote) => {
                            const includedFeatures = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
                            return includedFeatures.includes(feature.id) ? '✓' : '×';
                        })
                    };
                });

                function ensureSpace(doc: any, neededHeight: number, startY: number) {
                    const bottomMargin = 50;
                    const topMargin = 50;
                    if (startY + neededHeight > doc.page.height - bottomMargin) {
                        doc.addPage();
                        return topMargin;
                    }
                    return startY;
                }

                function drawComparisonTable(
                    doc: any,
                    data: { feature: string; quoteValues: string[] }[],
                    startX: number,
                    startY: number,
                    skipHeader: boolean = false
                ) {
                    const labelWidth = 130;
                    const quoteWidth = 120;
                    let y = startY;

                    if (!skipHeader) {
                        // Header row
                        doc.font('DejaVuSans').fontSize(9); // Changed from 7 to 10
                        y = ensureSpace(doc, 20, y);
                        doc.rect(startX, y, labelWidth, 20).fillAndStroke('#CCCCCC', '#0055A5');
                        doc.fillColor('black').text('Feature Details', startX + 5, y + 5);

                        quotation.quotes.forEach((quote, i) => {
                            const x = startX + labelWidth + i * quoteWidth;
                            doc.rect(x, y, quoteWidth, 20).fillAndStroke('#0055A5', '#0055A5');
                            doc.fillColor('black').text(quote.company.companyName, x + 5, y + 5, {
                                width: quoteWidth - 10
                            });
                        });
                        y += 20;
                    }

                    // Rows with dynamic height
                    doc.font('DejaVuSans').fontSize(9); // Changed from 6 to 10
                    data.forEach((row) => {
                        // Calculate dynamic height for feature column
                        const featureHeight = doc.heightOfString(row.feature, { width: labelWidth - 10 });
                        const lineCountFeature = Math.ceil(featureHeight / doc.currentLineHeight());
                        const rowHeightFeature = Math.max(lineCountFeature * 15, 30);

                        // Calculate dynamic height for quote values
                        const quoteHeights = row.quoteValues.map((val) => {
                            const height = doc.heightOfString(val, { width: quoteWidth - 10 });
                            const lineCount = Math.ceil(height / doc.currentLineHeight());
                            return Math.max(lineCount * 10, 10);
                        });
                        const rowHeight = Math.max(rowHeightFeature, ...quoteHeights);

                        y = ensureSpace(doc, rowHeight, y);

                        // Feature column
                        doc.rect(startX, y, labelWidth, rowHeight).fillAndStroke('#FFFFFF', '#0055A5');
                        doc.fillColor('black').text(row.feature, startX + 5, y + 5, {
                            width: labelWidth - 10,
                            align: 'center'
                        });

                        // Quote columns
                        doc.font('DejaVuSans').fontSize(10).fillColor(colors.success);
                        row.quoteValues.forEach((val, i) => {
                            const x = startX + labelWidth + i * quoteWidth;
                            doc.rect(x, y, quoteWidth, rowHeight).fillAndStroke('#FFFFFF', '#0055A5');
                            doc.fillColor(val === '✓' ? colors.success : colors.error);
                            doc.fontSize(11).text(val, x + 5, y + 5, { width: quoteWidth - 10, align: 'center' });
                        });

                        y += rowHeight;
                    });

                    return y;
                }

               

                doc.image(logoPath, 50, 25, { width: 140, height: 22 });

                // Header info on the right
                doc.fontSize(8).fillColor(colors.lightText).font('DejaVuSans');
                doc.text(`Generated: ${new Date().toLocaleDateString()}`, 350, 35, { align: 'right' });
                doc.text(`Validity: ${data.validityDate}`, 350, 48, { align: 'right' });

                doc.moveDown(1);

                doc.fillColor('#0055A5')
                    .fontSize(18)
                    .font('DejaVuSans-Bold')
                    .text('INSURANCE QUOTATION', 50, 70, { align: 'left' });
                doc.moveTo(50, 100).lineTo(560, 100).lineWidth(2).strokeColor(colors.accent).stroke();

                doc.moveDown(0.5);

                // Customer Greeting
                doc.fillColor('#242424')
                    .fontSize(11) // Reduced from 10
                    .font('DejaVuSans-Bold')
                    .text(`Dear ${data.customerName},`, 50, doc.y + 5);
                doc.moveDown(0.3);
                doc.fillColor('#3B3B3B').fontSize(9.5).font('DejaVuSans');
                if (data.insuranceType === Insurance_Type.Health) {
                    doc.text(
                        `Warm greetings from Acumen! We Truly appriciate the trust you've placed in us to safeguard your faimily's health and wellbeing.`,
                        50,
                        doc.y
                    );
                } else if (data.insuranceType === Insurance_Type.Life) {
                    doc.text(
                        `Warm greetings from Acumen! We truly appreciate the trust you’ve placed in us to safeguard your family’s future and financial wellbeing.`,
                        50,
                        doc.y
                    );
                } else if (data.insuranceType === Insurance_Type.Motor) {
                    doc.text(
                        `Warm greetings from Acumen! We truly appreciate the trust you’ve placed in us to protect your vehicle and ensure your peace of mind on the road.`,
                        50,
                        doc.y
                    );
                } else {
                    doc.text(
                        `Warm greetings from Acumen! We Truly appriciate the trust you've placed in us.`,
                        50,
                        doc.y
                    );
                }

                doc.moveDown(1);
                // draw table is for dependent details, insured details, vehicle details
                const drawTable = (
                    title: string,
                    headers: string[],
                    rows: string[][],
                    startX: number,
                    startY: number,
                    colWidths: number[]
                ) => {
                    const columnX: number[] = [startX];

                    for (let i = 0; i < colWidths.length - 1; i++) {
                        columnX.push(columnX[i] + colWidths[i]);
                    }

                    doc.font('DejaVuSans-Bold').fontSize(10).fillColor('#003087').text(title, startX, startY);

                    let y = startY + 20;

                    // --- Draw Header ---
                    doc.font('DejaVuSans-Bold').fontSize(9).fillColor('#242424');

                    // First, calculate max header height
                    const headerHeights = headers.map((header, i) => {
                        return doc.heightOfString(header, { width: colWidths[i] - 10, align: 'center' });
                    });
                    const headerHeight = Math.max(...headerHeights) + 10; // Add some padding

                    headers.forEach((header, i) => {
                        const x = columnX[i];
                        // doc.strokeColor('#0055A5').lineWidth(1);
                        doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                        doc.fillColor('#0055A5');
                        doc.rect(x, y, colWidths[i], headerHeight).stroke().fill();
                        doc.fillColor('#242424');
                        doc.text(header, x + 5, y + 5, {
                            width: colWidths[i] - 10,
                            align: 'center'
                        });
                    });
                    y += headerHeight;

                    // --- Draw Rows ---
                    doc.font('DejaVuSans').fontSize(9).fillColor('black');

                    rows.forEach((row, rowIndex) => {
                        if (!Array.isArray(row)) {
                            console.error(`Invalid row at index ${rowIndex}:`, row);
                            throw new Error(`Invalid row data for table: ${title}`);
                        }

                        // Calculate dynamic row height based on cell content
                        const rowHeights = row.map((cell, i) => {
                            return doc.heightOfString(cell, { width: colWidths[i] - 10, align: 'center' });
                        });
                        const rowHeight = Math.max(...rowHeights) + 10; // Add padding

                        row.forEach((cell, i) => {
                            const x = columnX[i];
                            doc.lineWidth(0.5);
                            doc.fillColor('#0055A5');
                            doc.rect(x, y, colWidths[i], rowHeight).stroke().fill();
                            doc.fillColor('black');
                            doc.text(cell, x + 5, y + 5, {
                                width: colWidths[i] - 10,
                                align: 'center'
                            });
                        });

                        y += rowHeight;
                    });

                    return y;
                };

                doc.fontSize(11)
                    .font('DejaVuSans-Bold')
                    .fillColor('black')
                    .text('Proposer Information', 50, doc.y + 15);
                doc.moveDown(0.1);
                const proposerStartY = doc.y + 10; // Add a bit of padding

                // LEFT SIDE DETAILS
                let currentY = proposerStartY;

                // Helper function to draw label and value
                function addDetail(label, value) {
                    const startX = 50;
                    const labelWidth = 60; // adjust for alignment

                    // Label in bold
                    doc.font('DejaVuSans-Bold').fontSize(8).fillColor('#525252').text(label, startX, currentY);

                    // Value in normal
                    doc.font('DejaVuSans')
                        .fontSize(9)
                        .fillColor('black')
                        .text(value, startX + 75, currentY);
                    currentY += 12;
                }
                // Add details
                addDetail('Name:', data.proposer.name);
                doc.moveDown(0.2);
                addDetail('Mobile No:', data.mobileNo);
                doc.moveDown(0.2);
                addDetail('Email ID:', data.emailId);
                doc.moveDown(0.2);
                addDetail('PIN Code:', data.pinCode);
                doc.moveDown(0.4);

                if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
                    addDetail('DOB:', data.proposer.dob);
                    doc.moveDown(0.2);
                    addDetail('Gender:', data.proposer.gender);
                    doc.moveDown(0.2);
                    addDetail('Height:', `${data.proposer.height} cm`);
                    doc.moveDown(0.2);
                    addDetail('Weight:', `${data.proposer.weight} kg`);
                    doc.moveDown(0.2);
                    addDetail('PED Declared:', data.pedDeclared);
                }

                // RIGHT SIDE DETAILS
                const rightX = 370; // adjust as needed for alignment
                let rightY = proposerStartY;

                doc.fontSize(9).font('DejaVuSans-Bold').fillColor('#0055A5').text(`Ticket No:`, rightX, rightY);

                doc.font('DejaVuSans')
                    .fillColor('black')
                    .text(`${data.ticketNumber}`, rightX + 60, rightY);

                rightY += 2;

                doc.font('DejaVuSans-Bold')
                    .fillColor('#0055A5')
                    .text(`Quotation No.:`, rightX, rightY + 15);

                doc.font('DejaVuSans')
                    .fillColor('black')
                    .text(`${quotation.quotationNo || '-'}`, rightX + 90, rightY + 15);

                rightY += 2;

                doc.font('DejaVuSans-Bold')
                    .fillColor('#0055A5')
                    .text(`Insurance Type:`, rightX, rightY + 30);

                doc.font('DejaVuSans')
                    .fillColor('black')
                    .text(`${formatToCamelCase(data.insuranceType)}`, rightX + 90, rightY + 30);

                rightY += 2;

                doc.font('DejaVuSans-Bold')
                    .fillColor('#0055A5')
                    .text(`Date:`, rightX, rightY + 45);

                doc.font('DejaVuSans')
                    .fillColor('black')
                    .text(formattedDate, rightX + 50, rightY + 45);

                doc.moveDown(1);
                // === After drawing left and right details ===
                const leftHeight = currentY - proposerStartY; // left column height
                const rightHeight = rightY + 12 - proposerStartY; // right column height, + line spacing
                const maxHeight = Math.max(leftHeight, rightHeight);

                // Move doc.y below the taller column
                doc.y = proposerStartY + maxHeight + 10; // 10 = padding before next section

                let yPosition = doc.y;

                // === Conditional Tables Based on Insurance Type ===
                if (data.insuranceType === Insurance_Type.Motor) {
                    const vehicleHeaders = [
                        'RC Owner',
                        'Engine No.',
                        'Chassis No.',
                        'Date of Reg.',
                        'Vehicle No.',
                        'Vehicle Model-Make'
                    ];

                    const vehicleRows = [
                        [
                            data.vehicleDetails.rcOwnerName || 'N/A',
                            data.vehicleDetails.engineNumber || 'N/A',
                            data.vehicleDetails.chassisNumber || 'N/A',
                            data.vehicleDetails.dateOfReg || 'N/A',
                            data.vehicleDetails.vehicleNumber || 'N/A',
                            `${data.vehicleDetails.modelNumber || 'N/A'} - ${data.vehicleDetails.makingYear || 'N/A'}`
                        ]
                    ];
                    yPosition = drawTable(
                        'Vehicle Details',
                        vehicleHeaders,
                        vehicleRows,
                        50,
                        yPosition,
                        [100, 80, 80, 80, 80, 110]
                    );
                    doc.moveDown(1);
                }

                if (data.insuranceType === Insurance_Type.Health) {
                    if (data.dependentDetails && data.dependentDetails.length > 0) {
                        const dependentHeaders = ['Name', 'DOB', 'Gender', 'Height', 'Weight'];
                        const dependentRows = data.dependentDetails.map((person) => [
                            person.name || 'N/A',
                            person.dob,
                            person.gender,
                            `${person.height} cm`,
                            `${person.weight} kg`
                        ]);
                        yPosition = drawTable(
                            'Dependent Details',
                            dependentHeaders,
                            dependentRows,
                            50,
                            yPosition,
                            [100, 90, 80, 80, 80]
                        );
                        doc.moveDown(1);
                    }
                }

                if (data.insuranceType === Insurance_Type.Life) {
                    const insuredHeaders = ['Name', 'DOB', 'Gender', 'Height', 'Weight'];
                    const insuredRows = [
                        [
                            data.insuredPersons.name,
                            data.insuredPersons.dob,
                            data.insuredPersons.gender,
                            `${data.insuredPersons.height} cm`,
                            `${data.insuredPersons.weight} kg`
                        ]
                    ];
                    yPosition = drawTable(
                        'Insured Person Details',
                        insuredHeaders,
                        insuredRows,
                        50,
                        yPosition,
                        [130, 90, 80, 80, 80]
                    );
                    doc.moveDown(1);
                }
                // this is for message 1
                const tableBottomY = yPosition;
                const padding = 15;
                if (data.insuranceType === Insurance_Type.Health) {
                    doc.fillColor('#242424').fontSize(10).font('DejaVuSans');
                    doc.text(
                        `Your family’s health and peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present needs and your loved ones’ future security.`,
                        50,
                        tableBottomY + padding,
                        { width: 500 }
                    );
                } else if (data.insuranceType === Insurance_Type.Life) {
                    doc.text(
                        `Your family’s financial security and peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present needs and your loved ones’ future wellbeing.`,
                        50,
                        tableBottomY + padding,
                        { width: 500 }
                    );
                } else if (data.insuranceType === Insurance_Type.Motor) {
                    doc.text(
                        `Your vehicle’s protection and your peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present requirements and your future security on the road.`,
                        50,
                        tableBottomY + padding,
                        { width: 500 }
                    );
                } else {
                    doc.text(
                        `We have customized product list suiting your requirements. Still if you feel the need for clarity, please contact to branch manager`,
                        50,
                        tableBottomY + padding,
                        { width: 500 }
                    );
                }

                doc.moveDown(1);

                // === Quotes Table code start from here ===
                const tableTop = doc.y + 10;
                // const quoteWidth = 130;
                // const labelWidth = 100;
                const labelWidth = 130; // Increased from 100 → wider "Details" column
                const quoteWidth = 120; // Slightly reduced to balance table width if needed

                let fields = [];
                if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
                    fields = ['Company', 'Product', 'Coverage', 'Premium', 'Benefits', 'Advantages', 'Remarks'];
                }
                if (data.insuranceType === Insurance_Type.Motor) {
                    fields = ['Company', 'IDV', 'Cover Type', 'NCB(%)', 'Premium', 'Coverage Included', 'Remarks'];
                }

                let fieldsBeforePremium = fields;
                let fieldsAfterPremium = [];
                if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
                    const premiumIndex = fields.indexOf('Premium');
                    fieldsBeforePremium = fields.slice(0, premiumIndex + 1);
                    fieldsAfterPremium = fields.slice(premiumIndex + 1);
                }

                const fieldKeyMap = {
                    Company: 'companyName',
                    Product: 'productName',
                    Coverage: 'coverage',
                    Premium: 'premium',
                    Benefits: 'benefits',
                    Advantages: 'advantages',
                    Remarks: 'remarks',
                    IDV: 'idv',
                    'Cover Type': 'coverType',
                    'NCB(%)': 'ncb',
                    'Coverage Included': 'coverageIncluded'
                };

                let y = tableTop;
                // --- Draw Header Row ("Details" and Company Logos) ---
                doc.font('DejaVuSans-Bold')
                    .fontSize(9) // Reduced from 10
                    .fillColor('black');
                doc.rect(50, y, labelWidth, 20).lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                doc.fillColor('black');
                doc.text('Details', 50 + 2, y + 5, { width: labelWidth - 4, align: 'center' });

                // Fetch company logos for the header
                const imageBuffers = await Promise.all(
                    data.quotes.map(async (quote) => {
                        try {
                            const response = await axios.get(quote.companyLogo, { responseType: 'arraybuffer' });
                            return Buffer.from(response.data, 'binary');
                        } catch (err) {
                            console.error(`Error fetching logo for ${quote.companyName}: ${err.message}`);
                            return null;
                        }
                    })
                );

                // Draw each company logo (or fallback text) in the header
                data.quotes.forEach((quote, i) => {
                    const x = 50 + labelWidth + i * quoteWidth;
                    doc.rect(x, y, quoteWidth, 20).lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');

                    const imageBuffer = imageBuffers[i];
                    if (imageBuffer) {
                        doc.image(imageBuffer, x + 5, y + 2, {
                            fit: [quoteWidth - 10, 16],
                            align: 'center',
                            valign: 'center'
                        });
                    } else {
                        doc.fillColor('black').text(`Quote ${i + 1}`, x + 5, y + 5, {
                            width: quoteWidth - 10,
                            align: 'center'
                        });
                    }
                });
                y += 20;

                // Quote Details with Adjusted Dynamic Heights
                doc.font('DejaVuSans')
                    .fontSize(9) // Reduced from 9
                    .fillColor('black');

                fieldsBeforePremium.forEach((field, fieldIndex) => {
                    // Step 1: Calculate the height needed for the field name (e.g., "Features")
                    doc.font('DejaVuSans'); // Set font for the label
                    const labelHeight = doc.heightOfString(field, {
                        width: labelWidth - 10,
                        align: 'center'
                    });

                    // Step 2: Calculate the height needed for each quote value in this row
                    const quoteHeights = data.quotes.map((quote) => {
                        const key = fieldKeyMap[field];
                        const value = quote[key] || 'N/A';
                        doc.font('DejaVuSans'); // Set font for the value
                        const baseHeight = doc.heightOfString(value.toString(), {
                            width: quoteWidth - 10,
                            align: 'center'
                        });
                        const lineCount = Math.ceil(baseHeight / (doc.currentLineHeight() || 9));
                        const adjustedHeight = baseHeight + (lineCount - 1) * 2;
                        return adjustedHeight;
                    });

                    // Step 3: Determine the row height as the tallest cell in this row, with padding
                    const baseRowHeight = Math.max(labelHeight, ...quoteHeights, 15);
                    const rowHeight = baseRowHeight + 10;

                    y = ensureSpace(doc, rowHeight, y);

                    // Step 4: Draw the field name cell (e.g., "Features") with dynamic height
                    doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                    doc.fillColor('#0055A5');
                    doc.rect(50, y, labelWidth, rowHeight).stroke().fill();
                    doc.fillColor('black')
                        .font('DejaVuSans-Bold')
                        .text(field, 50 + 5, y + 5, {
                            width: labelWidth - 10,
                            align: 'center'
                        });

                    // Step 5: Draw each quote value cell in this row with dynamic height
                    data.quotes.forEach((quote, quoteIndex) => {
                        const x = 50 + labelWidth + quoteIndex * quoteWidth;
                        const key = fieldKeyMap[field];
                        const value = quote[key] || 'N/A';

                        doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                        doc.fillColor('#0055A5');
                        doc.rect(x, y, quoteWidth, rowHeight).stroke().fill();
                        doc.fillColor('black')
                            .font('DejaVuSans')
                            .text(value.toString(), x + 5, y + 5, {
                                width: quoteWidth - 10,
                                align: 'center'
                            });
                    });

                    // Step 6: Move down by the dynamic row height
                    y += rowHeight;
                });

                const numQuotes = data.quotes.length;
                const totalWidth = labelWidth + numQuotes * quoteWidth;

                // Merged row for Basic Features
                y = ensureSpace(doc, 20, y);
                doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                doc.fillColor('#0055A5');
                doc.rect(50, y, totalWidth, 20).stroke().fill();
                doc.fillColor('black');
                doc.font('DejaVuSans-Bold')
                    .fontSize(9) // Reduced from 10
                    .text('Basic Features', 50 + 5, y + 5, { width: totalWidth - 10 });
                y += 20;
                // here is code for basic features details
                y = drawComparisonTable(doc, finalBasicData, 50, y, true);

                // Merged row for Add-on Features
                y = ensureSpace(doc, 20, y);
                y = ensureSpace(doc, 20, y);
                doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                doc.fillColor('#0055A5');
                doc.rect(50, y, totalWidth, 20).stroke().fill();
                doc.fillColor('black');
                doc.font('DejaVuSans-Bold')
                    .fontSize(9) // Reduced from 10
                    .text('Add-on Features', 50 + 5, y + 5, { width: totalWidth - 10 });
                y += 20;

                y = drawComparisonTable(doc, finalAddOnData, 50, y, true);

                fieldsAfterPremium.forEach((field, fieldIndex) => {
                    // Step 1: Calculate the height needed for the field name (e.g., "Features")
                    doc.font('DejaVuSans-Bold'); // Set font for the label
                    const labelHeight = doc.heightOfString(field, {
                        width: labelWidth - 10,
                        align: 'center'
                    });

                    // Step 2: Calculate the height needed for each quote value in this row
                    const quoteHeights = data.quotes.map((quote) => {
                        const key = fieldKeyMap[field];
                        const value = quote[key] || 'N/A';
                        doc.font('DejaVuSans'); // Set font for the value
                        const baseHeight = doc.heightOfString(value.toString(), {
                            width: quoteWidth - 10,
                            align: 'center'
                        });
                        const lineCount = Math.ceil(baseHeight / (doc.currentLineHeight() || 9));
                        const adjustedHeight = baseHeight + (lineCount - 1) * 2;
                        return adjustedHeight;
                    });

                    // Step 3: Determine the row height as the tallest cell in this row, with padding
                    const baseRowHeight = Math.max(labelHeight, ...quoteHeights, 15);
                    const rowHeight = baseRowHeight + 5;

                    y = ensureSpace(doc, rowHeight, y);

                    // Step 4: Draw the field name cell (e.g., "Features") with dynamic height
                    doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                    doc.fillColor('#0055A5');
                    doc.rect(50, y, labelWidth, rowHeight).stroke().fill();
                    doc.fillColor('black')
                        .font('DejaVuSans-Bold')
                        .text(field, 50 + 5, y + 5, {
                            width: labelWidth - 10,
                            align: 'center'
                        });

                    // Step 5: Draw each quote value cell in this row with dynamic height
                    data.quotes.forEach((quote, quoteIndex) => {
                        const x = 50 + labelWidth + quoteIndex * quoteWidth;
                        const key = fieldKeyMap[field];
                        const value = quote[key] || 'N/A';

                        doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
                        doc.fillColor('#0055A5');
                        doc.rect(x, y, quoteWidth, rowHeight).stroke().fill();
                        doc.fillColor('black')
                            .font('DejaVuSans')
                            .text(value.toString(), x + 5, y + 5, {
                                width: quoteWidth - 10,
                                align: 'center'
                            });
                    });

                    // Step 6: Move down by the dynamic row height
                    y += rowHeight;
                });

                // === NEW QUOTES COMPARISON TABLE ===
                doc.moveTo(50, y + 10)
                    .lineTo(530, y + 10)
                    .lineWidth(0.5)
                    .strokeColor('#cccccc')
                    .stroke();
                doc.moveDown(3);

                doc.fillColor('#242424').fontSize(10).font('DejaVuSans');
                doc.text(
                    `We hope this quotation brings clarity and confidence in making the right choice. Our team is always here to walk you through every detail. Please don’t hesitate to reach out if you’d like a personal consultation.`,
                    50,
                    doc.y
                );
                // -------------------------------
                const footerX = 50;
                const pageWidth = doc.page.width;
                const bottomMargin = 50;

                // Footer elements' heights
                const phoneHeight = 12;
                const addressHeight = 12;
                const copyrightHeight = 10;
                const lineHeight = 2;
                const spacing = 5;

                const footerTotalHeight =
                    phoneHeight + spacing + addressHeight + spacing + copyrightHeight + spacing + lineHeight;

                // Calculate Y to position footer at the bottom
                let footerY = doc.page.height - bottomMargin - footerTotalHeight;

                // --- Phone Number ---
                doc.image(phonePath, footerX, footerY, { width: 10, height: 10 });
                doc.fontSize(9).fillColor(colors.text).font('DejaVuSans');
                doc.text(`${data.branch.contact}`, footerX + 12, footerY);

                footerY += phoneHeight + spacing;

                // --- Branch Address ---
                // doc.fontSize(10).fillColor(colors.primary).font('DejaVuSans-Bold');
                // doc.text('◉ ', footerX, footerY, { continued: true });
                // doc.fontSize(8.5).fillColor(colors.text).font('DejaVuSans');
                // doc.text(data.branch.address);

                // --- Location Icon + Address ---
                // const locationIconPath = path.resolve(__dirname, 'assets/images/placeholder.png'); // your uploaded icon path
                doc.image(locationPath, footerX, footerY, { width: 10, height: 10 }); // adjust y offset if needed
                doc.fontSize(8.5).fillColor(colors.text).font('DejaVuSans');
                doc.text(data.branch.address, footerX + 12, footerY); // text starts a bit right of icon

                footerY += addressHeight + spacing;

                // --- Copyright (centered) ---
                doc.fontSize(7.5).fillColor(colors.lightText).font('DejaVuSans');
                doc.text('© 2025 Acumen Insurance. All rights reserved.', 0, footerY, {
                    align: 'center',
                    width: pageWidth
                });

                footerY += copyrightHeight + spacing;

                // --- Decorative Line ---
                doc.moveTo(50, footerY)
                    .lineTo(pageWidth - 50, footerY)
                    .lineWidth(0.5)
                    .strokeColor('#668cff')
                    .stroke();

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    async sendQuotation(ticket: any, quotationId: string): Promise<any> {
        try {
            const pdfBuffer = await this.generateQuotationPDF(ticket, quotationId);
            // const ticketData = await this.ticketRepo
            //     .createQueryBuilder('ticket')
            //     .leftJoinAndSelect('ticket.insuranceUserId', 'insuranceUserId')
            //     .leftJoinAndSelect('ticket.branch', 'branch')
            //     .where('ticket.id = :ticketId', { ticketId })
            //     .getOne();
            console.log('in send quoatation function ticket is', ticket);

            const customerEmail = ticket.insuranceUserId.emailId;
            const customerName = ticket.insuranceUserId.name;
            const branchManager = ticket?.branch?.contactPerson;
            const branchPhone = ticket?.branch?.phone;
            console.log('in send quoatation ', customerEmail, customerName, branchManager, branchPhone);

            await this.emailService.sendEmailWithAttachments(
                customerEmail,
                'Your Insurance Quotation from Acumen',
                `
              <p>Dear ${customerName},</p>
              <p>Please find your insurance quotation attached.</p>
              <p>Contact: ${branchManager}, ${branchPhone}</p>
            `,
                [
                    {
                        filename: `quotation_${ticket.insuranceType}_${ticket.id}.pdf`,
                        content: pdfBuffer
                    }
                    //   {
                    //     filename: 'brochure.pdf',
                    //     path: 'https://your-s3-bucket.s3.amazonaws.com/brochure.pdf',
                    //   },
                ]
            );
            // console.log('Email sent successfully');

            // await this.quotationRepository.update(quotationId, { status: 'SENT' });
            return {
                status: 'success',
                message: 'Quotation sent successfully',
                data: null
            };
        } catch (err) {
            console.error('sendQuotation Error:', err);
            throw new Error('Failed to send quotation: ' + err.message);
        }
    }

    // this is for download pdf
    async downloadQuotationPdf(
        ticket: any,
        quotationId: string
    ): Promise<{ status: string; message: string; data: Buffer }> {
        try {
            const pdfBuffer = await this.generateQuotationPDF(ticket, quotationId);

            // Instead of sending email, return the PDF buffer for download
            return {
                status: 'success',
                message: 'Quotation PDF downloaded successfully',
                data: pdfBuffer
            };
        } catch (err) {
            console.error('sendQuotation Error:', err);

            throw new Error('Failed to generate quotation PDF: ' + err.message);
        }
    }

    // this is for generating Quotation and sending mail with status changes
    async generateQuotation(reqBody: any): Promise<any> {
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { isSendMail, ticketId, quotes } = reqBody;
            // console.log('formQuoteData:', isSendMail, quotes);
            if (!ticketId || !quotes) {
                return {
                    status: 'error',
                    message: 'Invalid request body',
                    data: null
                };
            }
            // Fetch the ticket with relations
            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId', 'branch']
            });
            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }

            // Generate quotation number and validity date
            const quotationNumber = await generateQuoteId(ticketId);

            const today = new Date();
            const validityDate = new Date(today);
            validityDate.setDate(validityDate.getDate() + 7);

            // Create and save the InsuranceQuotation entity
            const quotation = this.quotationRepository.create({
                quotationNo: quotationNumber,
                ticketId: ticket,
                ticketnumber: ticket.ticketNumber,
                validityDate: validityDate,
                status: Quotation_Status.QUOTATION_GENERATED,
                createdBy: userEntity,
                updatedBy: userEntity,
                isActive: true
            });
            const savedQuotation = await this.quotationRepository.save(quotation);

            // Save each quote in QuoteEntity
            const savedQuotes = [];
            for (const quoteData of quotes) {
                // Fetch company and product
                const company = await this.insCompanyRepo.findOne({ where: { id: parseInt(quoteData.companyId) } });
                const product = await this.productRepo.findOne({ where: { id: quoteData.productId } });
                if (!company || !product) {
                    return {
                        status: 'error',
                        message: `Invalid company or product for quote: companyId=${quoteData.companyId}, productId=${quoteData.productId}`,
                        data: null
                    };
                }

                // Create and save QuoteEntity
                const quote = this.quotesRepo.create({
                    quotationId: savedQuotation,
                    company: company,
                    product: product,
                    companyLogo: company.companyLogo || null,
                    coveragedRequired: quoteData.coveragedRequired || null,
                    Premium: quoteData.Premium || null,
                    ncb: quoteData.ncb || null,
                    coverageIncluded: quoteData.coverageIncluded || null,
                    coverageType: quoteData.coverageType || null,
                    idv: quoteData.idv || null,
                    features: quoteData.features || null,
                    advantages: quoteData.advantages || null,
                    benefits: quoteData.benefits || null,
                    shortDescription: quoteData.shortDescription || null,
                    additionalRemarks: quoteData.additionalRemarks || null,
                    createdBy: userEntity,
                    updatedBy: userEntity,
                    isActive: true
                });
                const savedQuote = await this.quotesRepo.save(quote);
                savedQuotes.push(savedQuote);
            }

            // Update ticket status to QUOTATION_GENERATED
            const updateData = await this.ticketRepo.update(ticket.id, {
                currentStepStart: Current_Step.QUOTATION_GENERATED,
                nextStepStart: Current_Step.QUOTATION_SENT,
                nextStepDeadline: addDays(3),
                updatedBy: userEntity,
                updatedAt: new Date()
            });

            const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await this.ticketRepo.query(query, [
                ticket.id,
                ticket.ticketNumber,
                ticket.insuranceUserId.id,
                ticket.assignTo || null,
                Ticket_Status.IN_PROGRESS,
                TICKET_LOG_EVENTS.TICKET_STEP_CHANGED,
                Current_Step.QUOTATION_GENERATED,
                new Date(),
                Current_Step.QUOTATION_SENT,
                addDays(3),
                ticket.insuranceType,
                ticket.agentRemarks,
                ticket.othersRemarks,
                userEntity.id
            ]);
            const result = await this.ticketNotiService.scheduleDeadlineNotification(
                ticketId,
                Current_Step.QUOTATION_GENERATED,
                addDays(3)
            );
            // console.log("result",result);

            // Handle email sending if isSendMail is true
            if (isSendMail) {
                const responsemsz = await this.sendQuotation(ticket, String(savedQuotation.id));
                if (responsemsz.status === 'success') {
                    await this.quotationRepository.update(savedQuotation.id, {
                        status: Quotation_Status.QUOTATION_SENT,
                        sentAt: new Date()
                    });

                    await this.ticketRepo.update(ticket.id, {
                        currentStepStart: Current_Step.QUOTATION_SENT,
                        updatedBy: userEntity,
                        updatedAt: new Date()
                    });

                    const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    const updatedTicket = await this.ticketRepo.findOne({ where: { id: ticketId } });
                    await this.ticketRepo.query(query, [
                        ticket.id,
                        ticket.ticketNumber,
                        ticket.insuranceUserId.id,
                        ticket.assignTo || null,
                        Ticket_Status.IN_PROGRESS,
                        TICKET_LOG_EVENTS.TICKET_STEP_CHANGED,

                        // Current_Step.QUOTATION_SENT,
                        // ticket.nextStepDeadline,

                        Current_Step.QUOTATION_SENT,
                        new Date(),
                        Current_Step.SUBMITTED_FOR_REVISION,
                        updatedTicket.nextStepDeadline,

                        ticket.insuranceType,
                        ticket.agentRemarks,
                        ticket.othersRemarks,
                        userEntity.id
                    ]);

                    return {
                        status: 'success',
                        message: 'Quotation generated & sent successfully'
                    };
                } else {
                    return {
                        status: 'failed',
                        message: 'Quotation generated but failed to send'
                    };
                }
            }
            return {
                status: 'success',
                message: 'Quotation generated successfully'
                // data: {
                //     quotation: savedQuotation,
                //     quotes: savedQuotes
                // }
            };
        } catch (err) {
            console.error('generateQuotation Error:', err);
            return {
                status: 'error',
                message: 'Failed to generate quotation: ' + err.message,
                data: null
            };
        }
    }

    async getQuotationByTicketId(id: number) {
        const query = 'CALL get_quotationByTicketId(?)';
        const result = await this.quotationRepository.query(query, [id]);

        if (!result || result.length === 0) {
            throw new Error(`No Quotation found for ticket with ID ${id}`);
        }

        return result[0];
    }

    async sendQuotationMail(reqBody: any): Promise<any> {
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { ticketId, quotationId } = reqBody;
            // console.log('formQuoteData:', isSendMail, quotes);
            if (!ticketId || !quotationId) {
                return {
                    status: 'error',
                    message: 'Invalid request body',
                    data: null
                };
            }
            // Fetch the ticket with relations
            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId']
            });
            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }

            const responsemsz = await this.sendQuotation(ticketId, String(quotationId));
            if (responsemsz.status === 'success') {
                await this.quotationRepository.update(quotationId, {
                    status: Quotation_Status.QUOTATION_SENT,
                    isMailSend: true,
                    sentAt: new Date()
                });

                await this.ticketRepo.update(ticket.id, {
                    currentStepStart: Current_Step.QUOTATION_SENT,
                    updatedBy: userEntity,
                    updatedAt: new Date()
                });

                const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                await this.ticketRepo.query(query, [
                    ticket.id,
                    ticket.ticketNumber,
                    ticket.insuranceUserId.id,
                    ticket.assignTo || null,
                    Ticket_Status.IN_PROGRESS,
                    TICKET_LOG_EVENTS.TICKET_STEP_CHANGED,

                    Current_Step.QUOTATION_SENT,
                    new Date(),
                    Current_Step.SUBMITTED_FOR_REVISION,
                    ticket.nextStepDeadline,

                    ticket.insuranceType,
                    ticket.agentRemarks,
                    ticket.othersRemarks,
                    userEntity.id
                ]);

                return {
                    status: 'success',
                    message: 'Quotation sent successfully'
                };
            }
            return {
                status: 'error',
                message: 'failed to send quotation'
                // data: {
                //     quotation: savedQuotation,
                //     quotes: savedQuotes
                // }
            };
        } catch (err) {
            console.error('send quotation mail Error:', err);
            return {
                status: 'error',
                message: 'Failed to send quotation: ' + err.message,
                data: null
            };
        }
    }

    async downloadQuotation(reqBody: any): Promise<any> {
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { ticketId, quotationId } = reqBody;

            if (!ticketId || !quotationId) {
                return {
                    status: 'error',
                    message: 'Invalid request body',
                    data: null
                };
            }
            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId', 'branch']
            });
            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }
            const responsedata = await this.downloadQuotationPdf(ticket, String(quotationId));
            return responsedata;
        } catch (err) {
            console.error('send quotation mail Error:', err);
        }
    }

    async changedQuotatinSatus(reqBody: any, req: any): Promise<any> {
        try {
            //  const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;
            // console.log('logged user email :', req);

            // console.log('changedQuotatinSatus:', reqBody);
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { ticketId, quotationId, status, changedRemarks, isProductSelected, selectedProduct } = reqBody;

            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId']
            });

            const product = await this.productRepo.findOne({ where: { id: selectedProduct } });

            const quotation = await this.quotationRepository.findOne({ where: { id: quotationId } });
            if (!ticket || !quotation) {
                return {
                    status: 'error',
                    message: 'Ticket or Quotation not found',
                    data: null
                };
            }

            const quote = await this.quotesRepo.findOne({
                where: {
                    quotationId: { id: quotationId },
                    product: { id: selectedProduct }
                },
                relations: ['quotationId', 'product', 'company']
            });
            // console.log('in insurance quotation service quote is here', quote);
            let nextStep = Current_Step[status as keyof typeof Current_Step] || Current_Step.SUBMITTED_FOR_REVISION;
            let nextStepDeadline = ticket.nextStepDeadline;

            switch (status) {
                case Current_Step.SUBMITTED_FOR_REVISION:
                    nextStep = Current_Step.REVISED_AND_UPDATE;
                    break;
                case Current_Step.REVISED_AND_UPDATE:
                    if (ticket.currentStepStart === Current_Step.REVISED_AND_UPDATE) {
                        return {
                            status: 'error',
                            message: 'Status Already changed to Revised and update'
                        };
                    }
                    nextStep = Current_Step.CUSTOMER_APPROVED;
                    break;
                case Current_Step.CUSTOMER_APPROVED:
                    if (ticket.currentStepStart === Current_Step.CUSTOMER_APPROVED) {
                        return {
                            status: 'error',
                            message: 'Already aproved by customer'
                        };
                    }
                    //         const now = new Date();
                    // const twoMinutesLater = new Date(now.getTime() + 1 * 60 * 1000);
                    nextStep = Current_Step.PAYMENT_LINK_GENERATED;
                    nextStepDeadline = addHours(24);
                    // nextStepDeadline = twoMinutesLater;
                    // write code for update isProductSelected and selectedProduct
                    await this.ticketRepo.update(ticket.id, {
                        isProductSelected: true,
                        selectedProduct: product,
                        selectedQuotation: quotation,
                        selectedCoveraged: quote.coveragedRequired,
                        SelectedPremium: quote.Premium
                    });
                    break;
            }

            // Prepare the update object
            const updateData: any = {
                status: status,
                updatedAt: new Date()
            };

            if (status === Quotation_Status.SUBMITTED_FOR_REVISION) {
                updateData.statusChangedRemarks = changedRemarks || null;
            }

            const quotationUpdate = await this.quotationRepository.update(quotationId, updateData);

            if (quotationUpdate) {
                await this.ticketRepo.update(ticket.id, {
                    currentStepStart: status,
                    currentStepStartAt: new Date(),
                    nextStepStart: nextStep,
                    nextStepDeadline: nextStepDeadline,
                    updatedBy: userEntity,
                    updatedAt: new Date(),
                    quotationRevisedRemarks: changedRemarks || null
                });

                const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                await this.ticketRepo.query(query, [
                    ticket.id,
                    ticket.ticketNumber,
                    ticket.insuranceUserId.id,
                    ticket.assignTo || null,
                    Ticket_Status.IN_PROGRESS,
                    TICKET_LOG_EVENTS.TICKET_STEP_CHANGED,

                    // status,
                    // ticket.nextStepDeadline,
                    status,
                    new Date(),
                    nextStep,
                    nextStepDeadline,

                    ticket.insuranceType,
                    ticket.agentRemarks,
                    ticket.othersRemarks,
                    userEntity.id
                ]);

                if (status === Current_Step.CUSTOMER_APPROVED) {
                    //          const now = new Date();
                    // const twoMinutesLater = new Date(now.getTime() + 1 * 60 * 1000);
                    await this.ticketNotiService.scheduleDeadlineNotification(
                        ticketId,
                        Current_Step.CUSTOMER_APPROVED,
                        addHours(24)
                        // twoMinutesLater
                    );
                }

                return {
                    status: 'success',
                    message: 'Quotation status changed successfully'
                };
            }
        } catch (error) {
            console.log('-api/insurance-ticket/updateTicketStatus', error.message);
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: null
            };
        }
    }

    async getQuotationById(quotationId: any): Promise<any> {
        try {
            // Validate input
            if (!quotationId) {
                return {
                    status: 'error',
                    message: 'Quotation ID is required',
                    data: null
                };
            }

            const quotation = await this.quotationRepository.findOneOrFail({
                where: { id: quotationId },
                relations: ['quotes', 'quotes.company', 'quotes.product', 'ticketId']
            });

            const quotationData = {
                quotationId: quotation.id,
                ticketId: quotation.ticketId.id,
                status: quotation.status,
                createdAt: quotation.createdAt,
                updatedAt: quotation.updatedAt,
                quotes: quotation.quotes.map((quote) => ({
                    id: quote.id,
                    companyId: quote.company?.id,
                    companyName: quote.company?.companyName,
                    productId: quote.product?.id,
                    productName: quote.product?.name,
                    premium: quote.Premium, // Note: Check if 'Premium' should be 'premium' (case sensitivity)
                    coveragedRequired: quote.coveragedRequired, // Typo: Should be 'coverageRequired'?
                    ncb: quote.ncb,
                    idv: quote.idv,
                    coverageIncluded: quote.coverageIncluded,
                    coverageType: quote.coverageType,
                    features: quote.features,
                    advantages: quote.advantages,
                    benefits: quote.benefits,
                    shortDescription: quote.shortDescription,
                    additionalRemarks: quote.additionalRemarks,
                    createdAt: quote.createdAt,
                    updatedAt: quote.updatedAt
                }))
            };

            return {
                status: 'success',
                message: 'Quotation fetched successfully',
                data: quotationData
            };
        } catch (error) {
            console.error('-api/insurance-ticket/getQuotationById', error.message);
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: null
            };
        }
    }

    async updateQuotation(reqBody: any): Promise<any> {
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }

            const { quotationId, ticketId, quotes } = reqBody;

            if (!ticketId || !quotationId || !quotes || !Array.isArray(quotes)) {
                return {
                    status: 'error',
                    message: 'Invalid request body: ticketId, quotationId, and quotes are required',
                    data: null
                };
            }
            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId']
            });
            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }
            const quotation = await this.quotationRepository.findOne({
                where: { id: quotationId },
                relations: ['ticketId', 'quotes']
            });
            if (!quotation) {
                return {
                    status: 'error',
                    message: 'Quotation not found',
                    data: null
                };
            }

            const today = new Date();
            const validityDate = new Date(today);
            validityDate.setDate(validityDate.getDate() + 3);

            const updatedQuotation = await this.quotationRepository.update(quotation.id, {
                status: Quotation_Status.REVISED_AND_UPDATE
            });

            // Handle quotes: update existing, add new, remove deleted
            const updatedQuotes = [];

            for (const quoteData of quotes) {
                const company = await this.insCompanyRepo.findOne({ where: { id: parseInt(quoteData.companyId) } });
                const product = await this.productRepo.findOne({ where: { id: quoteData.productId } });
                if (!company || !product) {
                    return {
                        status: 'error',
                        message: `Invalid company or product for quote: companyId=${quoteData.companyId}, productId=${quoteData.productId}`,
                        data: null
                    };
                }

                // Check if quote exists (assuming quoteData.id is provided for existing quotes)
                let quote = quotation.quotes?.find((q) => q.id === quoteData.id);
                if (quote) {
                    // Update existing quote using repository
                    const updatedQuote = await this.quotesRepo.save({
                        ...quote,
                        company,
                        product,
                        coveragedRequired: quoteData.coveragedRequired || null,
                        Premium: quoteData.Premium || null,
                        ncb: quoteData.ncb || null,
                        coverageIncluded: quoteData.coverageIncluded || null,
                        coverageType: quoteData.coverageType || null,
                        idv: quoteData.idv || null,
                        features: quoteData.features || null,
                        advantages: quoteData.advantages || null,
                        benefits: quoteData.benefits || null,
                        shortDescription: quoteData.shortDescription || null,
                        additionalRemarks: quoteData.additionalRemarks || null,
                        updatedBy: userEntity,
                        updatedAt: new Date(),
                        isActive: true
                    });
                    updatedQuotes.push(updatedQuote);
                } else {
                    // Create new quote
                    const newQuote = this.quotesRepo.create({
                        quotationId: quotation,
                        company,
                        product,
                        // companyLogo: company.companyLogo || null,
                        coveragedRequired: quoteData.coveragedRequired || null,
                        Premium: quoteData.Premium || null,
                        ncb: quoteData.ncb || null,
                        coverageIncluded: quoteData.coverageIncluded || null,
                        coverageType: quoteData.coverageType || null,
                        idv: quoteData.idv || null,
                        features: quoteData.features || null,
                        advantages: quoteData.advantages || null,
                        benefits: quoteData.benefits || null,
                        shortDescription: quoteData.shortDescription || null,
                        additionalRemarks: quoteData.additionalRemarks || null,
                        createdBy: userEntity,
                        updatedBy: userEntity,
                        isActive: true
                    });
                    const savedQuote = await this.quotesRepo.save(newQuote);
                    updatedQuotes.push(savedQuote);
                }
            }

            // Remove quotes not included in the updated list
            const quoteIdsToKeep = quotes.map((q) => q.id).filter((id) => id);
            const quotesToDelete = quotation.quotes?.filter((q) => !quoteIdsToKeep.includes(q.id)) || [];
            if (quotesToDelete.length > 0) {
                await this.quotesRepo.delete(quotesToDelete.map((q) => q.id));
            }

            // Update ticket status to REVISED_AND_UPDATE
            await this.ticketRepo.update(ticket.id, {
                currentStepStart: Current_Step.REVISED_AND_UPDATE,
                currentStepStartAt: new Date(),
                nextStepStart: Current_Step.CUSTOMER_APPROVED,
                nextStepDeadline: ticket.nextStepDeadline,
                updatedBy: userEntity,
                updatedAt: new Date()
            });

            // Log ticket update
            const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await this.ticketRepo.query(query, [
                ticket.id,
                ticket.ticketNumber,
                ticket.insuranceUserId.id,
                ticket.assignTo || null,
                Ticket_Status.IN_PROGRESS,
                TICKET_LOG_EVENTS.TICKET_STEP_CHANGED,
                Current_Step.REVISED_AND_UPDATE,
                new Date(),
                Current_Step.CUSTOMER_APPROVED,
                ticket.nextStepDeadline,
                ticket.insuranceType,
                ticket.agentRemarks,
                ticket.othersRemarks,
                userEntity.id
            ]);

            return {
                status: 'success',
                message: 'Quotation updated successfully'
            };
        } catch (err) {
            console.error('updateQuotation Error:', err);
            return {
                status: 'error',
                message: 'Failed to update quotation: ' + err.message,
                data: null
            };
        }
    }
}
