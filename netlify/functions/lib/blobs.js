const { getStore } = require('@netlify/blobs');

const SITE_ID = '268bde3a-87ee-4dac-9d04-05264cd8826c';

// Falls back to an explicit siteID/token when the runtime doesn't auto-inject
// Blobs context (observed on this account: works via CLI, not via the deployed function).
function getFundStore() {
  if (process.env.BLOBS_TOKEN) {
    return getStore({ name: 'family-fund', siteID: SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore('family-fund');
}

function getProofStore() {
  if (process.env.BLOBS_TOKEN) {
    return getStore({ name: 'family-fund-proofs', siteID: SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore('family-fund-proofs');
}

module.exports = { getFundStore, getProofStore, SITE_ID };
