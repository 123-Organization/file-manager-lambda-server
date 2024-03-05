const debug = require('debug');
const log = debug('app:getImageUrl');
const getImageUrl = (libraryType, fileNames, imageType, accountKey = "") => {
    let fileName = fileNames.replace(/ /g, "_");
    const splitFileName = fileName.split(/\/|%2F/);
    let folderName = "";
    let imageName = "";
    if (splitFileName.length > 2) {
      folderName = `${splitFileName[0]}/${splitFileName[1]}`;
      imageName = splitFileName[2];
    }
    else if (splitFileName.length > 1) {
      folderName = splitFileName[0];
      imageName = splitFileName[1];
      if (accountKey !== "") {
        folderName = `${accountKey}/${folderName}`;
      }
    }
    else {
      folderName = splitFileName[0].split('.')[0];
      imageName = splitFileName[0];
      if (accountKey !== "") {
        folderName = `${accountKey}/${folderName}`;
      }
    }
  
  
    let bucketName = "";
    if (libraryType === 'temporary') {
      bucketName = process.env.TEMPORARY_BUCKET_NAME;
    }
    else {
      if (imageType === 'original') {
        bucketName = process.env.INVENTORY_BUCKET_ORIGINAL_IMAGE_NAME;
      }
      else {
        bucketName = process.env.INVENTORY_BUCKET_PREVIEW_IMAGE_NAME;
      }
    }
    // get full URL//
    if (imageType == 'thumbnail') {
      return `http://${bucketName}.s3.us-east-1.amazonaws.com/${folderName}/thumbnail/200x200_${imageName}`;
    }
    if (imageType == 'original') {
      return `http://${bucketName}.s3.us-east-1.amazonaws.com/${folderName}/${imageName}`;
    }
    if (imageType == 'preview') {
      return `http://${bucketName}.s3.us-east-1.amazonaws.com/${folderName}/preview/${imageName}`;
    }
  
}
module.exports = getImageUrl;