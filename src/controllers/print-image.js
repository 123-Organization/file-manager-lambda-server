const debug = require('debug');
const log = debug('app:printImages');
const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
const { uuid } = require("uuidv4");
exports.printImages = async (req, res) => {
    try {
      log(`Get print Images ${JSON.stringify(req.body)}`);
      const obj = JSON.parse(JSON.stringify(req.body));
      const random_uuid = uuid();
      const getGuids = obj.guids;
      let payloadForListForUpdateList = {
        guids: getGuids,
        guid: random_uuid,
      };
      await finerworksService.UPDATE_LIST_IMAGE_FOR_PRINT(payloadForListForUpdateList);
      res.status(200).json({
        statusCode: 200,
        status: true,
        data: random_uuid,
      });
    } catch (err) {
      console.log(err);
      log(`Get print Images Error ${JSON.stringify(err)}`);
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: JSON.stringify(err),
      });
    }
  };