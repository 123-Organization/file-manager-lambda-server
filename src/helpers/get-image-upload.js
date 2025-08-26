const checkForImageExtensionForTiffNBmp = require('./get-image-extenstion-for-bmp-n-tiff');
const testImageResolution = require('./test-image-resolution');
const getFileName = require('./get-file-name');
const getImageUrl = require('./get-image-url');
const finerworksService = require('./finerworks-service');
const debug = require('debug');
const log = debug('app:getImageUploaded');
const createEvent = require('./create-event');
const getImageUploaded = async (obj, uploadedImages,extractedFilename) => {
  console.log("obj",obj);
  console.log("uploadedImages",uploadedImages);

    const {
      title,
      description,
      libraryName,
      librarySessionId,
      libraryAccountKey,
      librarySiteId,
    } = obj;
    log(`Reached to upload the image with details ${JSON.stringify(obj)}`);
    /** check for Tiff & Bmp file*/
    console.log("step1");
    const getFileNameToBeUploaded = await checkForImageExtensionForTiffNBmp(uploadedImages.key);
    const originalImageName = extractImageName(uploadedImages);
    console.log("imageName===========",originalImageName);  
    console.log("step1");
    console.log("step2");

    /** check width & height of Image */
    let imageSize = await testImageResolution(uploadedImages.location);
    console.log("imageSize=======>>>>>",imageSize);
    console.log("step2");

    log('imageSize:', imageSize);
    console.log("step3");
    /** Extract Image name from the URL */
    const imageName = getFileName(getFileNameToBeUploaded);
    console.log("step3");
    console.log("step4");

    /** Get Thumbnail Url */
    const getThumbnailsUrl = getImageUrl(libraryName, getFileNameToBeUploaded, 'thumbnail', libraryAccountKey);
    /** Get Preview Url */
    const getPreviewUrl = getImageUrl(libraryName, getFileNameToBeUploaded, 'preview', libraryAccountKey);
    console.log("step4");

    let payloadForFinerWorks = {
      images: [
        {
          title: title ? title : "",
          description: description ? description : "",
          file_name: extractedFilename,
          file_size: uploadedImages.size,
          thumbnail_file_name: `200x200_${imageName}`,
          preview_file_name: imageName,
          hires_file_name: imageName,
          public_thumbnail_uri: getThumbnailsUrl,
          public_preview_uri: getPreviewUrl,
          private_hires_uri: uploadedImages.location,
          pix_w: imageSize.width,
          pix_h: imageSize.height,
        },
      ],
      library: {
        name: libraryName,
        session_id: librarySessionId,
        account_key: libraryAccountKey,
        site_id: librarySiteId,
      },
    };
    log(`Prepared to upload the Image details to finerwork service ${JSON.stringify(payloadForFinerWorks)}`);
    console.log("step5",payloadForFinerWorks);
    const getImage = await finerworksService.POST_IMAGE(payloadForFinerWorks);
    console.log("step5");

    return getImage;
};


function extractImageName(data) {
  const pathParts = data.key.split('/');
  const fullFileName = pathParts[pathParts.length - 1]; // Get the last part of the path
  // Remove the prefix (e.g., 'm175336025013500678__') using a regular expression
  const fileName = fullFileName.replace(/^[^_]*__/, ''); 
  return fileName;
}
module.exports = getImageUploaded;