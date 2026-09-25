const express = require('express');
const router = express.Router();
const metadataService = require('../services/metadataService');

// GET /api/metadata/search?query=...
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const data = await metadataService.searchMetadata(query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, results: [] });
  }
});

module.exports = router;
