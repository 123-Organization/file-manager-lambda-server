const debug = require('debug');
const log = debug('app:deleteImage');
const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
exports.deleteImage = async (req, res) => {
    const obj = req.body;
    const { libraryName, librarySessionId, libraryAccountKey, librarySiteId, guids } = obj;
    log(`Delete Image details for the account ${libraryAccountKey} & guid is ${guids.split(",")}`);
    try {
      let payloadForListForDelete = {
        guids: guids.split(","),
        library: {
          name: libraryName,
          session_id: librarySessionId,
          account_key: libraryAccountKey,
          site_id: librarySiteId,
        },
      };
      await finerworksService.DELETE_IMAGE(payloadForListForDelete);
      /** Log Event */
      createEvent('success', 'Delete Image', `${JSON.stringify(payloadForListForDelete)}`, librarySiteId);
      /** End Log Event */
      res.status(200).json({
        statusCode: 200,
        status: true,
      });
    } catch (error) {
      /** Log Event */
      log(`Error comes ${JSON.stringify(error)}`)
      const eventData = createEvent('error', 'Delete Image', JSON.stringify(error.response.data), librarySiteId);
      /** End Log Event */
      res.status(400).json({
        statusCode: 400,
        status: true,
        message: error.response.data,
        errorId: eventData.id
      });
    }
  };