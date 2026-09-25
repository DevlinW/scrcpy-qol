const https = require('https');
const adbService = require('./adbService');

/**
 * Performs a safe HTTPS GET request with timeout and response length guard
 */
function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return resolve(null);
      }

      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'scrcpy-qol-launcher/1.0',
            Accept: 'application/json',
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return resolve(null);
          }

          let data = '';
          res.setEncoding('utf-8');
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 500000) {
              // 500KB cap
              res.destroy();
              resolve(null);
            }
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (_) {
              resolve(null);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => {
        resolve(null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Searches metadata for game or app name
 */
async function searchMetadata(query) {
  if (!query || typeof query !== 'string') {
    return { success: true, results: [] };
  }

  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) {
    return { success: true, results: [] };
  }

  const results = [];

  // Try OpenGame / Open-Source Games public API if relevant
  try {
    const encoded = encodeURIComponent(cleanQuery);
    // e.g. Open Source Games / public search endpoint
    const ogData = await fetchJson(`https://open-source-games.com/api/games?search=${encoded}`, 4000);
    if (ogData && Array.isArray(ogData.games)) {
      ogData.games.slice(0, 5).forEach((g) => {
        results.push({
          id: `opengame_${g.id || g.slug}`,
          title: g.name || g.title,
          description: g.description || g.summary || '',
          iconUrl: g.icon || g.cover || '',
          bannerUrl: g.banner || g.header_image || '',
          source: 'api',
        });
      });
    }
  } catch (_) {}

  // Fallback: If no results found or API unavailable, provide an intelligent heuristic entry
  if (results.length === 0) {
    const isPackage = cleanQuery.includes('.');
    const title = isPackage ? adbService.beautifyPackageName(cleanQuery) : cleanQuery;
    results.push({
      id: `manual_${Date.now()}`,
      title,
      packageName: isPackage ? cleanQuery : '',
      description: `Android application (${title})`,
      iconUrl: '',
      bannerUrl: '',
      source: 'manual',
    });
  }

  return { success: true, results };
}

module.exports = {
  searchMetadata,
};
