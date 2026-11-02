import pdfParse from 'pdf-parse';

export async function extractFileMetadata(fileBuffer, originalName, mimeType) {
  try {
    const ext = originalName.split('.').pop().toLowerCase();
    
    let pageCount = 1;

    if (ext === 'pdf' && fileBuffer) {
      try {
        const data = await pdfParse(fileBuffer);
        if (data && data.numpages) {
          pageCount = data.numpages;
        }
      } catch (e) {
        // Parse failed — use honest minimum instead of random
        pageCount = 1;
      }
    } else if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
      // Non-PDF document types — honest default (no random fabrication)
      pageCount = 1;
    } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
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
  } catch (error) {
    return {
      fileName: originalName,
      fileSize: 1024 * 500,
      mimeType,
      extension: 'pdf',
      pageCount: 1
    };
  }
}
