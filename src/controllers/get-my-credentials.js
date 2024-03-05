const debug = require('debug');
const log = debug('app:getAllImages');
const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
exports.getMyCredentials = async (req, res) => {
    try {
      const obj = JSON.parse(JSON.stringify(req.body));
      const getResponse = await finerworksService.ARTZIP_INTEGRATIONS(obj.account_key);
      log(`Reached to get my credentials`);
      res.status(200).json({
        statusCode: 200,
        status: true,
        data: getResponse,
      });
    } catch (err) {
      console.log(err);
      log(`Error ${JSON.stringify(err)}`);
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: JSON.stringify(err),
      });
    }
  };