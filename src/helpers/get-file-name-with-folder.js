const debug = require('debug');
const log = debug('app:getFileNameWithFolder');
const getFileNameWithFolder = (fileNames, libraryAccountKey = "") => {
    let fileName = fileNames.replace(/ /g, "_");
    const splitFileName = fileName.split('.');
    let imageName = "";
    if (splitFileName.length > 1) {
      imageName = `${splitFileName[0]}/${fileName}`;
    } else {
      imageName = fileName;
    }
    if (libraryAccountKey != "") {
      imageName = `${libraryAccountKey}/${imageName}`
    }
    log(`Return file name with folder ${imageName}`)
    return imageName;
}
module.exports = getFileNameWithFolder;