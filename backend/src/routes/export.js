/**
 * Export routes — download TAB as PDF or PNG.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { asyncHandler } = require('../middleware/errorHandler');
const conversionPipeline = require('../services/conversionPipeline');
const exportService = require('../services/exportService');

const router = express.Router();

/**
 * GET /api/export/:jobId/pdf
 * Generate and download TAB as PDF.
 */
router.get(
  '/:jobId/pdf',
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = conversionPipeline.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'Conversion job not found or expired. Please convert again.',
      });
    }

    const pdfPath = await exportService.exportToPdf({
      ascii: job.ascii,
      meta: job.meta,
      jobId,
    });

    const filename = `${exportService.sanitizeFilename(job.meta.title || 'tabify-tab')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
  })
);

/**
 * GET /api/export/:jobId/png
 * Generate and download TAB as PNG.
 */
router.get(
  '/:jobId/png',
  asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const job = conversionPipeline.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'JOB_NOT_FOUND',
        message: 'Conversion job not found or expired. Please convert again.',
      });
    }

    const pngPath = await exportService.exportToPng({
      ascii: job.ascii,
      meta: job.meta,
      jobId,
    });

    const filename = `${exportService.sanitizeFilename(job.meta.title || 'tabify-tab')}.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(pngPath);
    stream.pipe(res);
  })
);

module.exports = router;
