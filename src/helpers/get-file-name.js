const debug = require('debug');
const log = debug('app:getFileName');
const getFileName = (fileNames) => {
    let fileName = fileNames.replace(/ /g, "_");
    /** Get Original File name */
    const splitFileName = fileName.split(/\/|%2F/);
    let imageName = "";
    if (splitFileName.length >= 1) {
      imageName = splitFileName[splitFileName.length - 1];
    } else {
      imageName = splitFileName[0];
    }
    let extractRandomNumber = imageName.split('__');
    imageName = extractRandomNumber[extractRandomNumber.length - 1];
    log(`Return Image name ${imageName}`);
    return imageName;
}
module.exports = getFileName;