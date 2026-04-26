import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { generateBarcodePng, generateQrPng } from './barcode.service';
import { env } from '../config/env';

export interface ShippingLabelArgs {
  trackingCode: string;
  customerCode: string;
  customerName: string;
  serviceType: 'AIR' | 'SEA';
  weightLbs?: number | null;
  contentsDescription?: string | null;
  destination?: string | null;
}

/**
 * Generates a 4×6 inch shipping label PDF with PGFI branding, customer info,
 * route, weight, contents, plus a Code-128 barcode and QR code linking to the
 * public tracking page.
 */
export async function generateShippingLabelPdf(
  args: ShippingLabelArgs,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([288, 432]); // 4×6 inch @ 72 dpi
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const drawText = (
    text: string,
    x: number,
    y: number,
    size: number,
    bold = false,
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  drawText('PGFI Shipping', 16, 405, 18, true);
  drawText('pgfishipping.com', 16, 388, 9);

  drawText('SERVICE', 16, 360, 8, true);
  drawText(args.serviceType, 16, 348, 14, true);
  drawText('FROM -> TO', 110, 360, 8, true);
  drawText(`USA -> ${args.destination ?? 'Haiti'}`, 110, 348, 12);

  page.drawLine({
    start: { x: 12, y: 332 },
    end: { x: 276, y: 332 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  drawText('CUSTOMER', 16, 318, 8, true);
  drawText(args.customerName, 16, 304, 12, true);
  drawText(args.customerCode, 16, 290, 10);

  drawText('WEIGHT', 200, 318, 8, true);
  drawText(
    args.weightLbs ? `${args.weightLbs.toFixed(2)} lb` : '—',
    200,
    304,
    11,
  );

  drawText('CONTENTS', 16, 270, 8, true);
  drawText(args.contentsDescription?.slice(0, 60) ?? '—', 16, 256, 10);

  // Barcode
  const barcodePng = await generateBarcodePng(args.trackingCode);
  const barcodeImg = await pdf.embedPng(barcodePng);
  const bdims = barcodeImg.scaleToFit(260, 80);
  page.drawImage(barcodeImg, {
    x: (288 - bdims.width) / 2,
    y: 150,
    width: bdims.width,
    height: bdims.height,
  });

  drawText(args.trackingCode, 16, 130, 14, true);

  // QR
  const qrUrl = `${env.APP_URL}/track/${args.trackingCode}`;
  const qrPng = await generateQrPng(qrUrl);
  const qrImg = await pdf.embedPng(qrPng);
  const qdims = qrImg.scaleToFit(80, 80);
  page.drawImage(qrImg, {
    x: 288 - qdims.width - 16,
    y: 16,
    width: qdims.width,
    height: qdims.height,
  });

  drawText('Scan to track', 16, 32, 8);
  drawText(qrUrl, 16, 20, 7);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
