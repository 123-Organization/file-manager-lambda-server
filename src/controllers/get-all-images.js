const debug = require('debug');
const log = debug('app:getAllImages');
const createEvent = require('../helpers/create-event');
const finerworksService = require('../helpers/finerworks-service');
exports.getAllImages = async (req, res) => {
    
    const obj = req.body;
    const { libraryName, librarySessionId, libraryAccountKey, librarySiteId, filterPageNumber, filterPerPage, filterSearchFilter, filterUploadFrom, filterUploadTo, filterSortField, filterSortDirection } = obj;
    log(`Get all images for the ${JSON.stringify(obj)}`);
    try {
      let payloadForListImages = {
        library: {
          name: libraryName,
          session_id: librarySessionId,
          account_key: libraryAccountKey,
          site_id: librarySiteId,
        },
        search_filter: filterSearchFilter,
        page_number: filterPageNumber,
        per_page: filterPerPage,
        list_products: true,
        active: null,
        sort_field: filterSortField,
        sort_direction: filterSortDirection,
        upload_date_from: filterUploadFrom,
        upload_date_to: filterUploadTo,
      };
      const getImages = await finerworksService.LIST_IMAGE(payloadForListImages);
      /** Log Event */
      createEvent('success', 'List all Images', JSON.stringify(payloadForListImages), librarySiteId);
      /** End Log Event */
      res.status(200).json({
        statusCode: 200,
        status: true,
        data: getImages,
      });
    } catch (error) {
      /** Log Event */
      const eventData = await createEvent('error', 'Error while getting list all Images', JSON.stringify(error.response.data), librarySiteId);
      log(`Error while getting list all Images ${JSON.stringify(error.response.data)} for ${librarySiteId}`);
        /** End Log Event */
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: error.response.data,
        errorId: eventData.id
      });
    }
  };