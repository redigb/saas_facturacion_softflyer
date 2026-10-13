/**
 * Compresión de fotos estilo WhatsApp (spec 023): se reescala por píxeles en el propio
 * dispositivo y se reencoda a JPEG antes de subir. El servidor igual valida tamaño y formato.
 */
export const IMAGE_MAX_SIDE = 1600;
export const IMAGE_QUALITY = 0.82;

export type CompressedImage = {
  file: File;
  preview: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
};

export async function compressImage(source: File): Promise<CompressedImage> {
  const image = await loadImage(source);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Sin lienzo disponible.");

  // Fondo blanco: una PNG con transparencia no debe salir negra al pasar a JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY));
  if (!blob) throw new Error("No se pudo comprimir la imagen.");

  return {
    file: new File([blob], "foto.jpg", { type: "image/jpeg" }),
    preview: URL.createObjectURL(blob),
    originalBytes: source.size,
    compressedBytes: blob.size,
    width,
    height,
  };
}

function loadImage(source: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
