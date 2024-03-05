/** To get the bucket name according to the type of library */
const debug = require('debug');
const log = debug('app:getBucketName');
const getBucketName = (libraryType = 'inventory') => {
    log(`Get Bucket Name for ${libraryType}`);
    if (libraryType == 'temporary') {
      return process.env.TEMPORARY_BUCKET_NAME;
    }
    if (libraryType == 'inventory') {
      return process.env.INVENTORY_BUCKET_ORIGINAL_IMAGE_NAME;
    }
}
module.exports = getBucketName;