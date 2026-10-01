import { useState, useCallback, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Use local Vite bundled worker asset rather than external unpkg CDN
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface UploadedFileMeta {
  name: string;
  size: string;
  isPdf: boolean;
  mimeType: string;
}

interface UseFileUploadOptions {
  maxPdfBytes?: number;
  maxPdfPages?: number;
  maxImageDim?: number;
  onExtractedText?: (text: string) => void;
  onOcrFallbackNeeded?: (base64: string, mimeType: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxPdfBytes = 10 * 1024 * 1024, // Matches SERVER_CONFIG 10MB
    maxPdfPages = 5,
    maxImageDim = 1280,
    onExtractedText,
    onOcrFallbackNeeded,
  } = options;

  const [preview, setPreview] = useState<string | null>(null);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [incluirImagen, setIncluirImagen] = useState<boolean>(true);

  // Keep track of the current preview URL to revoke it on change or unmount
  const activeObjectURLRef = useRef<string | null>(null);

  const revokeCurrentObjectURL = useCallback(() => {
    if (activeObjectURLRef.current) {
      URL.revokeObjectURL(activeObjectURLRef.current);
      activeObjectURLRef.current = null;
    }
  }, []);

  // Cleanup active Object URL on hook unmount
  useEffect(() => {
    return () => {
      if (activeObjectURLRef.current) {
        URL.revokeObjectURL(activeObjectURLRef.current);
      }
    };
  }, []);

  const clearFile = useCallback(() => {
    revokeCurrentObjectURL();
    setPreview(null);
    setFileObject(null);
    setFileMeta(null);
    setError(null);
    setWarning(null);
    setIsProcessing(false);
  }, [revokeCurrentObjectURL]);

  // Read base64 on-demand only when requested by the API
  const getFileBase64 = useCallback(async (fileToRead: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Error al convertir el archivo a base64.'));
      };
      reader.readAsDataURL(fileToRead);
    });
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setWarning(null);

      // Validate MIME and extension
      const validMimes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];

      if (!validMimes.includes(file.type) && !validExtensions.some((val) => ext === val)) {
        setError('Formato de archivo no soportado. Sube una imagen (PNG, JPG, WebP) o un archivo PDF.');
        return;
      }

      const isPdfFile = file.type === 'application/pdf' || ext === '.pdf';

      if (isPdfFile) {
        if (file.size > maxPdfBytes) {
          setError(
            `El archivo PDF supera el límite de ${Math.round(
              maxPdfBytes / (1024 * 1024)
            )} MB. Comprímelo o sube una imagen de menor tamaño.`
          );
          return;
        }

        setIncluirImagen(false);
        setIsProcessing(true);

        try {
          revokeCurrentObjectURL();
          const objectUrl = URL.createObjectURL(file);
          activeObjectURLRef.current = objectUrl;
          setPreview(objectUrl);
          setFileObject(file);

          setFileMeta({
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            isPdf: true,
            mimeType: 'application/pdf',
          });

          // Read PDF directly via ArrayBuffer (no dataURL / base64 overhead in state)
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;

          if (pdfDoc.numPages > maxPdfPages) {
            setIsProcessing(false);
            setError(
              `El archivo PDF contiene ${pdfDoc.numPages} páginas. El máximo permitido es de ${maxPdfPages} páginas.`
            );
            return;
          }

          let extractedText = '';
          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items.map((item: any) => item.str || '').join(' ');
            if (pageStr.trim()) {
              extractedText += pageStr + '\n\n';
            }
          }

          const trimmed = extractedText.trim();
          if (trimmed.length > 10) {
            setIsProcessing(false);
            onExtractedText?.(trimmed);
            return;
          }

          // Generate base64 strictly on-demand for OCR fallback
          const b64 = await getFileBase64(file);
          onOcrFallbackNeeded?.(b64, 'application/pdf');
        } catch (pdfErr: any) {
          console.warn('PDF text extraction error, trying OCR fallback:', pdfErr);
          try {
            const b64 = await getFileBase64(file);
            onOcrFallbackNeeded?.(b64, 'application/pdf');
          } catch {
            setIsProcessing(false);
            setError('Error al procesar el archivo PDF.');
          }
        }
        return;
      }

      // Photos / Images - Read natively via Image and Canvas to avoid memory bloat
      setIncluirImagen(true);
      setIsProcessing(true);

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > maxImageDim || height > maxImageDim) {
          if (width > height) {
            height = Math.round((height * maxImageDim) / width);
            width = maxImageDim;
          } else {
            width = Math.round((width * maxImageDim) / height);
            height = maxImageDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to low-footprint jpeg blob directly in memory
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                const normalizedFile = new File([blob], file.name, { type: 'image/jpeg' });
                revokeCurrentObjectURL();
                const compressedUrl = URL.createObjectURL(normalizedFile);
                activeObjectURLRef.current = compressedUrl;
                setPreview(compressedUrl);
                setFileObject(normalizedFile);

                setFileMeta({
                  name: file.name,
                  size: `${(normalizedFile.size / 1024).toFixed(0)} KB (Optimizada)`,
                  isPdf: false,
                  mimeType: 'image/jpeg',
                });

                try {
                  const b64 = await getFileBase64(normalizedFile);
                  onOcrFallbackNeeded?.(b64, 'image/jpeg');
                } catch {
                  setIsProcessing(false);
                  setError('Error al codificar la imagen para resolución.');
                }
              } else {
                // Fallback to original
                useOriginalFile();
              }
            },
            'image/jpeg',
            0.85
          );
        } else {
          useOriginalFile();
        }
      };

      img.onerror = () => {
        useOriginalFile();
      };

      img.src = objectUrl;

      async function useOriginalFile() {
        revokeCurrentObjectURL();
        const fallbackUrl = URL.createObjectURL(file);
        activeObjectURLRef.current = fallbackUrl;
        setPreview(fallbackUrl);
        setFileObject(file);

        setFileMeta({
          name: file.name,
          size: `${(file.size / 1024).toFixed(0)} KB`,
          isPdf: false,
          mimeType: file.type || 'image/jpeg',
        });

        try {
          const b64 = await getFileBase64(file);
          onOcrFallbackNeeded?.(b64, file.type || 'image/jpeg');
        } catch {
          setIsProcessing(false);
          setError('Error al procesar la imagen.');
        }
      }
    },
    [maxPdfBytes, maxPdfPages, maxImageDim, onExtractedText, onOcrFallbackNeeded, getFileBase64, revokeCurrentObjectURL]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  return {
    preview,
    setPreview,
    fileObject,
    setFileObject,
    fileMeta,
    setFileMeta,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    warning,
    setWarning,
    incluirImagen,
    setIncluirImagen,
    clearFile,
    processFile,
    handleInputChange,
  };
}
