// Códigos QR en SVG generados al compilar (nítidos a cualquier tamaño de impresión).
import QRCode from 'qrcode';

export async function qrSvg(texto: string, color = '#171411'): Promise<string> {
  const svg = await QRCode.toString(texto, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: color, light: '#0000' },
  });
  return svg.replace('<svg ', '<svg class="qr" role="img" aria-label="Código QR" ');
}
