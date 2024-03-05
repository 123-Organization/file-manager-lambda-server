const debug = require('debug');
const log = debug('app:checkImageUrls');
const getImageUrl = require('./get-image-url');
const axios = require("axios");
const initialDelay = 0; // Delay before the first check in milliseconds
const intervalTime = 5000; // Interval time between checks in milliseconds
const checkIfImageExist = async (fileDetails, libraryName, libraryAccountKey) => {
    if(fileDetails.length){
        for (const imageUrl of fileDetails) {
            let imageNameToBeChecked = imageUrl.fileName;
            let getThumbnailURLToBechecked = getImageUrl(libraryName, imageNameToBeChecked, 'thumbnail', libraryAccountKey);
            if (getThumbnailURLToBechecked.toLowerCase().endsWith(".tif") ||
            getThumbnailURLToBechecked.toLowerCase().endsWith(".tiff")) {
                isFileNameChanged = true;
                getThumbnailURLToBechecked = `${getThumbnailURLToBechecked.replace(/\.\w+$/, ".png")}`;
            } else if (getThumbnailURLToBechecked.toLowerCase().endsWith(".bmp")) {
                isFileNameChanged = true;
                getThumbnailURLToBechecked = `${getThumbnailURLToBechecked.replace(/\.\w+$/, ".jpg")}`;
            }
            await checkImageRepeatedly(getThumbnailURLToBechecked);
        }
    }
}
const checkImageRepeatedly =async(imageUrl) => {
    // Initial check after initialDelay
    setTimeout(async () => {
        const interval = setInterval(async () => {
            await checkImageUrl(imageUrl, interval);
        }, intervalTime);

        // Clear the interval if the image exists after the initial check
        await checkImageUrl(imageUrl, interval);

    }, initialDelay);
}

async function checkImageUrl(imageUrl, interval) {
    try {
        const response = await axios.head(imageUrl);
        if (response.status === 200) {
            // Image exists, proceed further
            console.log('Image exists:', imageUrl);
            clearInterval(interval); // Stop further checks
            // Proceed further with your logic
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Image does not exist, log and continue checking
            log(`Thumbnail image is in processing ${imageUrl}`);
            console.log('Image does not exist:', imageUrl);
        } else {
            // Other errors, log and continue checking
            log(`Error in checking image URL: ${imageUrl}`);
            console.error('Error checking image URL:', error.message);
        }
    }
}
module.exports = checkIfImageExist;