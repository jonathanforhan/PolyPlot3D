/* Netlify Function for importing assets */
exports.handler = async (ev, ctx) => {
  const asset = ev.queryStringParameters.asset;
  const obj = require(`./assets/${asset}/${asset}.txt`);

  return {
    statusCode: 200,
    body: JSON.stringify({ obj }),
    headers: {
      'Content-Type': 'application/json; charset=utf8',
      'Access-Control-Allow-Origin': '*'
    }
  }
}

