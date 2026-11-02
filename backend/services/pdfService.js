import pdfParse from 'pdf-parse';

export async function extractFileMetadata(fileBuffer, originalName, mimeType) {
  const ext = originalName.split('.').pop().toLowerCase();

  let pageCount = 1;

  if (ext === 'pdf') {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error(`PDF file "${originalName}" is empty or missing buffer`);
    }
    try {
      const data = await pdfParse(fileBuffer);
      if (data && data.numpages && Number.isInteger(data.numpages) && data.numpages >= 1) {
        pageCount = data.numpages;
      } else {
        throw new Error(`Invalid PDF structure in "${originalName}"`);
      }
    } catch (e) {
      throw new Error(`PDF page-count extraction failed for "${originalName}": ${e.message || 'Corrupted or unreadable PDF'}`);
    }
  } else if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
    // Non-PDF document types
    pageCount = 1;
  } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    pageCount = 1;
  } else {
    pageCount = 1;
  }

  return {
    fileName: originalName,
    fileSize: fileBuffer ? fileBuffer.length : 1024 * 450,
    mimeType,
    extension: ext,
    pageCount
  };
}
