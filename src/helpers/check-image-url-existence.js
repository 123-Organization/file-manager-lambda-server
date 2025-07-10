const debug = require('debug');
const log = debug('app:checkImageUrls');
const getImageUrl = require('./get-image-url');
const axios = require("axios");
// const checkImageUrls = async (fileDetails, intervalId, counter, libraryName, libraryAccountKey) => {
//     for (const imageUrl of fileDetails) {
//       log(`start testing for the existence of ${JSON.stringify(imageUrl)}`);
//       let getThumbnailURL = getImageUrl(libraryName, imageUrl.fileName, 'thumbnail', libraryAccountKey);
//       let isFileNameChanged = false;
//       let getJpegImageName = `${imageUrl.fileName}`;
//       if (imageUrl.fileName.toLowerCase().endsWith(".tif") ||
//         imageUrl.fileName.toLowerCase().endsWith(".tiff")) {
//         isFileNameChanged = true;
//         getJpegImageName = `${imageUrl.fileName.replace(/\.\w+$/, ".png")}`;
//       } else if (imageUrl.fileName.toLowerCase().endsWith(".bmp")) {
//         isFileNameChanged = true;
//         getJpegImageName = `${imageUrl.fileName.replace(/\.\w+$/, ".jpg")}`;
//       }
//       if (isFileNameChanged) {
//         const getOriginialURL = getImageUrl(libraryName, getJpegImageName, 'original', libraryAccountKey);
//         try {
//           getThumbnailURL = getImageUrl(libraryName, getJpegImageName, 'thumbnail', libraryAccountKey);
//           await axios.get(getOriginialURL);
//           await axios.get(getThumbnailURL);
//           log(`URLS are ${getOriginialURL} ${getThumbnailURL}`);
//           counter++;
//         }
//         catch (error) {
//           console.log("Image does not exist", counter);
//         }
//       }
//       else {
//         try {
//           await axios.get(getThumbnailURL);
//         } catch (error) {
//           console.error('Error during axios.get:', error.message);
//         }
//         counter++;
//       }
//     }
//     if (counter === fileDetails.length) {
//       clearInterval(intervalId);
//       return "All images exist!";
//     }
// };


const checkImageUrls = async (fileDetails, libraryName, libraryAccountKey) => {
  let counter = 0;

  // Iterate through each file and check its URL
  for (const imageUrl of fileDetails) {
    log(`start testing for the existence of ${JSON.stringify(imageUrl)}`);
    let getThumbnailURL = getImageUrl(libraryName, imageUrl.fileName, 'thumbnail', libraryAccountKey);
    let isFileNameChanged = false;
    let getJpegImageName = `${imageUrl.fileName}`;

    if (imageUrl.fileName.toLowerCase().endsWith(".tif") || imageUrl.fileName.toLowerCase().endsWith(".tiff")) {
      isFileNameChanged = true;
      getJpegImageName = `${imageUrl.fileName.replace(/\.\w+$/, ".png")}`;
    } else if (imageUrl.fileName.toLowerCase().endsWith(".bmp")) {
      isFileNameChanged = true;
      getJpegImageName = `${imageUrl.fileName.replace(/\.\w+$/, ".jpg")}`;
    }

    try {
      if (isFileNameChanged) {
        const getOriginalURL = getImageUrl(libraryName, getJpegImageName, 'original', libraryAccountKey);
        getThumbnailURL = getImageUrl(libraryName, getJpegImageName, 'thumbnail', libraryAccountKey);
        await axios.get(getOriginalURL);
        await axios.get(getThumbnailURL);
        log(`URLs are ${getOriginalURL} ${getThumbnailURL}`);
      } else {
        await axios.get(getThumbnailURL);
      }
      counter++;
    } catch (error) {
      console.error('Error during axios.get:', error.message);
    }
  }
  console.log("counter==========>>>>>",counter);
  console.log("fileDetails.length",fileDetails.length);
  // Return success message if all URLs were checked
  if (counter === fileDetails.length) {
    return "All images exist!";
  } else {
    return "Some images may not exist!";
  }
};
module.exports = checkImageUrls;