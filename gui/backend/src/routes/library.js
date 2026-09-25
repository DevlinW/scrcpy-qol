const express = require('express');
const router = express.Router();
const fs = require('fs');
const configService = require('../services/configService');
const security = require('../utils/security');

// GET /api/library - Retrieve all curated library items
router.get('/', (req, res) => {
  try {
    const library = configService.getLibrary();
    res.json({ success: true, library });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/library - Add or update a library item
router.post('/', (req, res) => {
  try {
    const { packageName, title, description, iconUrl, bannerUrl, source, bitRate, turnScreenOff, stayAwake, fullscreen, customFlags } = req.body;

    if (!packageName || !security.isValidPackageName(packageName)) {
      return res.status(400).json({
        success: false,
        error: 'A valid Android package name (e.g. com.example.app) is required.',
      });
    }

    const saved = configService.addLibraryItem({
      packageName,
      title: title ? title.trim() : packageName,
      description: description ? description.trim() : '',
      iconUrl,
      bannerUrl,
      source,
      bitRate,
      turnScreenOff,
      stayAwake,
      fullscreen,
      customFlags,
    });

    res.json({ success: true, item: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/library/:id - Remove an item from the library
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = configService.removeLibraryItem(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/library/:id - Update an existing library item
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = configService.updateLibraryItem(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Library item not found.' });
    }
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/library/icons/:filename - Safely serve a cached icon PNG
router.get('/icons/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const pkgName = filename.replace(/\.png$/i, '');

    const safePath = configService.getCachedIconPath(pkgName);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Icon not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(safePath);
  } catch (_) {
    res.status(400).json({ error: 'Invalid icon request' });
  }
});

module.exports = router;
