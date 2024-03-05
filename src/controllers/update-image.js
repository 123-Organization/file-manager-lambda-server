const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
const debug = require('debug');
const log = debug('app:getAllImages');

exports.updateImage = async (req, res) => {
    const obj = req.body;
    const { guid, title, description, libraryAccountKey, librarySiteId } = obj;
    log(`Update Image Details ${JSON.stringify(obj)}`);
    try {
      if (guid == "") {
        /** Log Event */
        createEvent('warning', 'Update Image', 'Guid cannot be null', librarySiteId);
        /** End Log Event */
        res.status(400).json({
          statusCode: 400,
          status: false,
          message: "Guid cannot be null",
        });
      } else {
        let payloadForListForUpdate = {
          images: [
            {
              guid: guid,
              title: title,
              description: description,
            },
          ],
          account_key: libraryAccountKey,
        };
        await finerworksService.UPDATE_IMAGE(payloadForListForUpdate);
        /** Log Event */
        createEvent('success', 'Update Image', JSON.stringify(payloadForListForUpdate), librarySiteId);
        /** End Log Event */
        res.status(200).json({
          statusCode: 200,
          status: true,
        });
      }
    } catch (error) {
      /** Log Event */
      log(`Update Image Error ${JSON.stringify(error)}`);
      const eventData = createEvent('error', 'Update Image', `${JSON.stringify(error)}`, librarySiteId);
      /** End Log Event */
      res.status(400).json({
        statusCode: 400,
        status: true
      });
    }
  };