import multer from 'multer';

// Use memory storage for direct file processing & security
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(pdf|doc|docx|ppt|pptx|jpg|jpeg|png)$/i;
  if (file.originalname.match(allowedExtensions)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload PDF, DOCX, PPTX, JPG, or PNG files.'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter
});
