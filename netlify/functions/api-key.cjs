module.exports.handler = async () => {
  const apiKey = process.env['API_KEY']
  return {
    statusCode: 200,
    body: apiKey,
  };
}
