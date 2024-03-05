const debug = require('debug');
const log = debug('app:getListFileSelection');
const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
exports.getListFileSelection = async (req, res) => {
    try {
      const obj = JSON.parse(JSON.stringify(req.body));
      log(` get list file selection ${JSON.stringify(req.body)}`);
      const guid = obj.guid;
      const result = await finerworksService.LIST_FILE_SELECTION(guid);
      res.status(200).json({
        statusCode: 200,
        status: true,
        data: result
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
  }