import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using Vite-compatible import.meta.url resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract the page count from a PDF File object using Mozilla PDF.js.
 * Runs entirely in the browser — no server round-trip or file upload needed.
 *
 * @param {File} file - Browser File object (the original selected PDF)
 * @returns {Promise<{ pageCount: number }>}
 * @throws {Error} with descriptive message for corrupted, encrypted, or invalid PDFs
 */
export async function countPdfPages(file) {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      // Disable features we don't need — we only want page count
      disableFontFace: true,
      disableRange: true,
      disableStream: true,
    }).promise;

    const numPages = pdf.numPages;

    if (!numPages || numPages < 1) {
      throw new Error('PDF has 0 pages or is empty.');
    }

    return { pageCount: numPages };
  } catch (err) {
    // PDF.js sets specific error names for password-protected files
    if (
      err.name === 'PasswordException' ||
      err.message?.includes('password')
    ) {
      throw new Error(
        `PDF "${file.name}" is password-protected. Please remove the password and re-upload.`
      );
    }

    if (
      err.name === 'InvalidPDFException' ||
      err.message?.includes('Invalid PDF')
    ) {
      throw new Error(
        `"${file.name}" is not a valid PDF file or is corrupted. Please check the file and try again.`
      );
    }

    throw new Error(
      `Could not read "${file.name}": ${err.message || 'Unknown PDF error'}`
    );
  }
}

