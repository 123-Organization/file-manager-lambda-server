const AWS = require("aws-sdk");
const getImageUrl = require('../helpers/get-image-url');
const checkIfImageExist = require('../helpers/check-if-image-exist');
const getImageUploaded = require('../helpers/get-image-upload');
const debug = require('debug');
const log = debug('app:uploadImageByURL');
const checkForImageExtensionForTiffNBmp = require('../helpers/get-image-extenstion-for-bmp-n-tiff');
const createEvent = require('../helpers/create-event');
log('Start uploading Image from third party');
const s3 = new AWS.S3(
    {
      signatureVersion: "v4",
    },
    {
      params: {
        Bucket: process.env.BUCKET_NAME,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }
);
exports.uploadImageByURL = async (req, res) => {
    const obj = req.body;
    const { fileDetails, libraryName, libraryAccountKey, librarySiteId} = obj;
    try {
      if (fileDetails) {
        await checkIfImageExist(fileDetails, libraryName, libraryAccountKey);
        for (const files of fileDetails) {
            let getFileNameToBeUploaded = await checkForImageExtensionForTiffNBmp(files.fileName);
            const uploadedImages = {
            key: getFileNameToBeUploaded,
            size: files.fileSize,
            location: getImageUrl(libraryName, getFileNameToBeUploaded, 'original', libraryAccountKey),
            bucket: process.env.BUCKET_NAME,
            originalImage: files.fileName
            };
            log('Proceed to image upload', JSON.stringify(uploadedImages));
            await getImageUploaded(obj, uploadedImages);
        }
        log('Image has been uploaded successfully from third party');
        res.status(200).json({
            statusCode: 200,
            status: true,
            message: "Images has been uploaded successfully",
        });
      }
    } catch (error) {
        /** Log Event */
      log('Error', JSON.stringify(error));
      /** End Log Event */
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: JSON.stringify(error)
      });
    }
  };