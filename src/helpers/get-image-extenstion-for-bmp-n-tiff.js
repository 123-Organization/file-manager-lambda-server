/** convert the extension of the images for the tiff & bmp files */
const debug = require('debug');
const log = debug('app:checkForImageExtensionForTiffNBmp');
const checkForImageExtensionForTiffNBmp = async (fileName) => {
    if (fileName.toLowerCase().endsWith(".tif") ||
        fileName.toLowerCase().endsWith(".tiff")) {
            log(`Tiff file detected so file name replaced to png`)
        return `${fileName.replace(
            /\.\w+$/,
            ".png"
        )}`;
    }
    else if (fileName.toLowerCase().endsWith(".bmp")) {
        log(`Bmp file detected so file name replaced to jpg`)
        return `${fileName.replace(
            /\.\w+$/,
            ".jpg"
        )}`;
    } else {
        log(`Normal Image detected.`)
        return fileName;
    }
}
module.exports = checkForImageExtensionForTiffNBmp;