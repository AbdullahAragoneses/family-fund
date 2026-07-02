const { getStore } = require('@netlify/blobs');

const SITE_ID = '268bde3a-87ee-4dac-9d04-05264cd8826c';

function getProofStore() {
  if (process.env.BLOBS_TOKEN) {
    return getStore({ name: 'family-fund-proofs', siteID: SITE_ID, token: process.env.BLOBS_TOKEN });
  }
  return getStore('family-fund-proofs');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: 'Falta el parámetro id' };
  }

  try {
    const store = getProofStore();
    const result = await store.getWithMetadata(id, { type: 'arrayBuffer' });
    if (!result || !result.data) {
      return { statusCode: 404, body: 'Comprobante no encontrado' };
    }

    const contentType = (result.metadata && result.metadata.contentType) || 'application/octet-stream';
    const filename = (result.metadata && result.metadata.filename) || 'comprobante';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
      body: Buffer.from(result.data).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: err.message || 'Error interno' };
  }
};
