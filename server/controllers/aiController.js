import { analyzeDocumentAI } from '../services/aiService.js';

export const analyzeDocument = (req, res) => {
  const { fileName = 'Document.pdf', fileSize = 500000, pageCount = 10 } = req.body;
  const analysis = analyzeDocumentAI(fileName, fileSize, pageCount);
  return res.json({ success: true, analysis });
};
