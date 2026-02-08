import QRCode from 'qrcode';

export async function generateQRCode(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });
}
