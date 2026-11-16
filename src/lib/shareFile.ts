import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Base64 de unos bytes, por bloques para no desbordar la pila con archivos grandes. */
export function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function download(bytes: Uint8Array, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Guarda el archivo y lo entrega al usuario: en el móvil abre el menú de compartir
 * de Android; en el navegador lo descarga. Que el usuario cierre el menú no es un error.
 */
export async function saveAndShare(bytes: Uint8Array, fileName: string, mime: string): Promise<'shared' | 'downloaded'> {
  if (!Capacitor.isNativePlatform()) {
    download(bytes, fileName, mime);
    return 'downloaded';
  }
  const { uri } = await Filesystem.writeFile({ path: fileName, data: toBase64(bytes), directory: Directory.Cache });
  try {
    await Share.share({ title: fileName, files: [uri], dialogTitle: fileName });
  } catch (error) {
    if (!/cancel/i.test(String((error as Error)?.message ?? error))) throw error;
  }
  return 'shared';
}
