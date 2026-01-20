const axios = require('axios');
const { pool } = require('../config/db');

const normalizeVersion = (v) => String(v || '').trim();
const cmp = (a, b) => {
  const pa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0; const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
};

async function fetchIosVersion(bundleId, country) {
  try {
    const url = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}${country ? `&country=${country}` : ''}`;
    const { data } = await axios.get(url, { timeout: 12000 });
    const result = data && data.results && data.results[0];
    if (!result) return { success: false, reason: 'not_found' };
    return { success: true, version: result.version, storeUrl: result.trackViewUrl };
  } catch (e) {
    return { success: false, reason: 'network_error' };
  }
}

async function fetchAndroidVersion(packageName) {
  try {
    const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=US`;
    const { data: html } = await axios.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const candidates = [];
    const re1 = /"currentVersion"\s*:\s*"([^"]+)"/i;
    const re2 = /softwareVersion"[^>]*>([^<]+)</i;
    const re3 = /<div[^>]*>Current Version<\/div>\s*<span[^>]*><div[^>]*><span[^>]*>([^<]+)</i;
    const m1 = html.match(re1); if (m1) candidates.push(m1[1]);
    const m2 = html.match(re2); if (m2) candidates.push(m2[1]);
    const m3 = html.match(re3); if (m3) candidates.push(m3[1]);
    const version = normalizeVersion(candidates.find(Boolean));
    if (!version) return { success: false, reason: 'parse_failed' };
    return { success: true, version, storeUrl: `https://play.google.com/store/apps/details?id=${packageName}` };
  } catch (e) {
    return { success: false, reason: 'network_error' };
  }
}

exports.checkVersion = async (req, res) => {
  try {
    const platform = String(req.query.platform || '').toLowerCase();
    const currentVersion = normalizeVersion(req.query.currentVersion || '');
    const country = req.query.country || 'IN';
    let latestVersion, storeUrl;

    if (platform === 'ios') {
      const bundleId = req.query.bundleId;
      if (!bundleId) return res.status(400).json({ success: false, error: 'bundleId required' });
      const r = await fetchIosVersion(bundleId, country);
      if (!r.success) return res.status(200).json({ success: true, platform, currentVersion, latestVersion: null, hasUpdate: false, storeUrl: null, note: r.reason });
      latestVersion = r.version; storeUrl = r.storeUrl;
    } else if (platform === 'android') {
      const packageName = req.query.packageName;
      if (!packageName) return res.status(400).json({ success: false, error: 'packageName required' });
      const r = await fetchAndroidVersion(packageName);
      if (!r.success) return res.status(200).json({ success: true, platform, currentVersion, latestVersion: null, hasUpdate: false, storeUrl: null, note: r.reason });
      latestVersion = r.version; storeUrl = r.storeUrl;
    } else {
      return res.status(400).json({ success: false, error: 'unsupported platform' });
    }

    const hasUpdate = currentVersion && latestVersion ? cmp(latestVersion, currentVersion) > 0 : Boolean(latestVersion);
    res.json({ success: true, platform, currentVersion, latestVersion, hasUpdate, storeUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: 'server_error' });
  }
};

exports.getUpdateDialog = async (req, res) => {
  try {
    const platform = String(req.query.platform || 'all').toLowerCase();
    const currentVersion = normalizeVersion(req.query.currentVersion || '');
    const [rows] = await pool.query(
      `SELECT * FROM app_updates
       WHERE is_active=1 AND (platform=? OR platform='all')
       AND (display_from IS NULL OR display_from <= NOW())
       AND (display_to IS NULL OR display_to >= NOW())
       ORDER BY id DESC LIMIT 1`,
      [platform]
    );
    if (!rows || !rows[0]) {
      return res.json({ success: true, prompt: false, data: null });
    }
    const r = rows[0];
    const latestVersion = normalizeVersion(r.latest_version || '');
    const minVersion = normalizeVersion(r.min_version || '');
    const hasUpdate = latestVersion && currentVersion ? cmp(latestVersion, currentVersion) > 0 : Boolean(latestVersion);
    const needsForce = Number(r.force_update) === 1 && minVersion && currentVersion ? cmp(minVersion, currentVersion) > 0 : false;
    const prompt = hasUpdate || needsForce;
    const data = {
      title: r.title,
      message: r.message,
      forceUpdate: Number(r.force_update) === 1,
      latestVersion,
      minVersion,
      downloadUrl: r.download_url || null,
      buttonPrimaryText: r.button_primary_text || 'Update',
      buttonSecondaryText: r.button_secondary_text || null,
      platform: r.platform || 'all'
    };
    res.json({ success: true, prompt, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'server_error' });
  }
};
