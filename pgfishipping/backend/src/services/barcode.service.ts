import bwipjs from 'bwip-js';

export async function generateBarcodePng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 16,
    includetext: true,
    textxalign: 'center',
    backgroundcolor: 'FFFFFF',
  });
}

export async function generateQrPng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'qrcode',
    text,
    scale: 5,
    backgroundcolor: 'FFFFFF',
  });
}
