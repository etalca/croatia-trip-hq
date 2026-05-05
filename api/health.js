const { sendJson, storageMode } = require('../lib/trip-store');

module.exports = async function handler(req, res) {
  sendJson(res, 200, { ok: true, storage: storageMode() });
};
