/**
 * Conversion routes — upload sheet music and receive guitar TAB.
 */

const express = require('express');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const conversionPipeline = require('../services/conversionPipeline');
const { safeUnlink } = require('../utils/fileUtils');

const router = express.Router();

/**
 * GET /api/status
 * Returns system health and Audiveris availability.
 */
router.get('/status', asyncHandler(async (_req, res) => {
  const status = conversionPipeline.getSystemStatus();
  res.json({
    success: true,
    service: 'Tabify',
    version: '1.0.0',
    ...status,
  });
}));

/**
 * POST /api/convert
 * Accepts a sheet music file and returns generated guitar TAB.
 *
 * multipart/form-data field: "sheet" (image, PDF, or MusicXML)
 */
router.post(
  '/convert',
  upload.single('sheet'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'No file uploaded. Use field name "sheet".',
      });
    }

    const { path: filePath, originalname, mimetype } = req.file;

    try {
      const result = await conversionPipeline.convertUploadedFile(
        filePath,
        originalname,
        mimetype
      );

      res.json({
        success: true,
        data: result,
      });
    } finally {
      // Clean up uploaded temp file after processing
      safeUnlink(filePath);
    }
  })
);

module.exports = router;
