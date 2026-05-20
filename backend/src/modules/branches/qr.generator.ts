import QRCode from 'qrcode';
import { logger } from '../../shared/utils/logger';

/**
 * Generates a QR code as a base64 PNG data URL.
 * The encoded URL points to the public self-service page for a branch:
 *   ${webUrl}/s/${branchId}
 *
 * @param branchId - UUID of the branch
 * @param webUrl   - Base URL of the web application (e.g. https://app.fila.bo)
 * @returns        - A data URL string: "data:image/png;base64,..."
 */
export async function generateBranchQR(
  branchId: string,
  webUrl: string,
): Promise<string> {
  const targetUrl = `${webUrl}/s/${branchId}`;

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      type: 'image/png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    logger.debug({ branchId, targetUrl }, 'QR code generated');

    return dataUrl;
  } catch (err) {
    logger.error({ err, branchId, targetUrl }, 'Failed to generate QR code');
    throw new Error('QR_GENERATION_FAILED');
  }
}
