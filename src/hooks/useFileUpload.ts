import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

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
    maxPdfBytes = 5 * 1024 * 1024,
    maxPdfPages = 5,
    maxImageDim = 1280,
    onExtractedText,
    onOcrFallbackNeeded,
  } = options;

  const [preview, setPreview] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [incluirImagen, setIncluirImagen] = useState<boolean>(true);

  const clearFile = useCallback(() => {
    setPreview(null);
    setFileMeta(null);
    setError(null);
    setWarning(null);
    setIsProcessing(false);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setWarning(null);

      const isPdfFile =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdfFile) {
        if (file.size > maxPdfBytes) {
          setError(
            `El archivo PDF supera el límite máximo de ${Math.round(
              maxPdfBytes / (1024 * 1024)
            )} MB. Por favor comprímelo o sube una imagen del ejercicio.`
          );
          return;
        }

        setIncluirImagen(false);
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          setPreview(base64);
          setFileMeta({
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            isPdf: true,
            mimeType: 'application/pdf',
          });

          try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;

            if (pdfDoc.numPages > maxPdfPages) {
              setIsProcessing(false);
              setError(
                `El archivo PDF contiene más de ${maxPdfPages} páginas. Por favor sube únicamente las páginas relevantes del ejercicio.`
              );
              return;
            }

            let extractedText = '';
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
              const page = await pdfDoc.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageStr = textContent.items
                .map((item: any) => item.str || '')
                .join(' ');
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

            onOcrFallbackNeeded?.(base64, 'application/pdf');
          } catch (pdfErr) {
            console.warn('PDF text extraction error, falling back to OCR:', pdfErr);
            onOcrFallbackNeeded?.(base64, 'application/pdf');
          }
        };

        reader.onerror = () => {
          setIsProcessing(false);
          setError('Error al leer el archivo PDF.');
        };

        reader.readAsDataURL(file);
        return;
      }

      // Photos / Images
      setIncluirImagen(true);
      setIsProcessing(true);

      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
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
            const normalizedJpeg = canvas.toDataURL('image/jpeg', 0.85);
            setPreview(normalizedJpeg);
            setFileMeta({
              name: file.name,
              size: `${(file.size / 1024).toFixed(0)} KB`,
              isPdf: false,
              mimeType: 'image/jpeg',
            });
            onOcrFallbackNeeded?.(normalizedJpeg, 'image/jpeg');
          } else {
            setPreview(rawDataUrl);
            setFileMeta({
              name: file.name,
              size: `${(file.size / 1024).toFixed(0)} KB`,
              isPdf: false,
              mimeType: file.type || 'image/jpeg',
            });
            onOcrFallbackNeeded?.(rawDataUrl, file.type || 'image/jpeg');
          }
        };

        img.onerror = () => {
          setPreview(rawDataUrl);
          setFileMeta({
            name: file.name,
            size: `${(file.size / 1024).toFixed(0)} KB`,
            isPdf: false,
            mimeType: file.type || 'image/jpeg',
          });
          onOcrFallbackNeeded?.(rawDataUrl, file.type || 'image/jpeg');
        };

        img.src = rawDataUrl;
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setError('Error al leer la imagen seleccionada.');
      };

      reader.readAsDataURL(file);
    },
    [maxPdfBytes, maxPdfPages, maxImageDim, onExtractedText, onOcrFallbackNeeded]
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
