const AWS = require("aws-sdk");
const getBucketName = require('../helpers/get-bucket-name');
const getFileNameWithFolder = require('../helpers/get-file-name-with-folder');
const getImageUrl = require('../helpers/get-image-url');
const checkImageUrls = require('../helpers/check-image-url-existence');
const getImageUploaded = require('../helpers/get-image-upload');
const checkForImageExtensionForTiffNBmp = require('../helpers/get-image-extenstion-for-bmp-n-tiff');
const debug = require('debug');
const log = debug('app:UploadImage');
const createEvent = require('../helpers/create-event');
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
exports.saveImage = async (req, res) => {
    try {
      log(`saveImage ${JSON.stringify(req.body)}`);
      const obj = JSON.parse(JSON.stringify(req.body));
      const uploadedImages = {
        location: obj.imageUrl,
        key: obj.imageKey,
        size: obj.imageSize,
        originalImage: obj.imageUrl
      };
      await getImageUploaded(obj, uploadedImages);
      res.status(200).json({
        statusCode: 200,
        status: true,
        message: "Images has been uploaded successfully",
      });
    } catch (err) {
      log(`saveImage Error ${JSON.stringify(err)}`);
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: JSON.stringify(err),
      });
    }
};
exports.uploadImageByURL = async (req, res) => {
    try {
      log(`uploadImageByURL`);
      const obj = req.body;
      let intervalId;
      let counter = 0;
      const { fileDetails, libraryName, libraryAccountKey } = obj;
      if (fileDetails) {
        intervalId = setInterval(async () => {
          const result = await checkImageUrls(fileDetails, intervalId, counter, libraryName, libraryAccountKey);
          if (result) {
            for (const files of fileDetails) {
              let getFileNameToBeUploaded = await checkForImageExtensionForTiffNBmp(files.fileName);
              const uploadedImages = {
                key: getFileNameToBeUploaded,
                size: files.fileSize,
                location: getImageUrl(libraryName, getFileNameToBeUploaded, 'original', libraryAccountKey),
                bucket: process.env.BUCKET_NAME,
                originalImage: files.fileName
              };
              await getImageUploaded(obj, uploadedImages);
            }
            res.status(200).json({
              statusCode: 200,
              status: true,
              message: "Images has been uploaded successfully",
            });
          }
        }, 5000);
      }
    } catch (error) {
      /** Log Event */
      log(`uploadImageByURL error ${JSON.stringify(error)}`);
      const eventData = await createEvent('success', 'Error while uploading image', JSON.stringify(error), librarySiteId);
      /** End Log Event */
      res.status(400).json({
        statusCode: 400,
        status: false,
        message: JSON.stringify(error),
        errorId: eventData.id
      });
    }
};
exports.startUploadImages = (req, res) => {
    log('start upload images');
    const bucketName = getBucketName(req.query.fileLibrary);
    try {
      let params = {
        Bucket: bucketName,
        Key: getFileNameWithFolder(req.query.fileName, req.query.libraryAccountKey),
        ContentType: req.query.fileType,
        Tagging: req.query.basecampProjectID,
        ACL: "public-read",
      };
  
  
      return new Promise((resolve, reject) =>
        s3.createMultipartUpload(params, (err, uploadData) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.send({ uploadId: uploadData.UploadId }));
          }
        })
      );
    } catch (err) {
      log(`startUploadImages error ${JSON.stringify(err)}`);
      console.log(err);
      return err;
    }
};

exports.getUploadUrl = (req, res) => {
    log(`Get upload url`);
    const bucketName = getBucketName(req.query.fileLibrary);
    try {
      let params = {
        Bucket: bucketName,
        Key: String(getFileNameWithFolder(req.query.fileName, req.query.libraryAccountKey)),
        UploadId: req.query.uploadId,
        PartNumber: req.query.partNumber,
      };
  
      //concurrency!!
      return new Promise((resolve, reject) =>
        s3.getSignedUrl("uploadPart", params, (err, presignedUrl) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.send({ presignedUrl }));
          }
        })
      );
    } catch (err) {
      log(`getUploadUrl error ${JSON.stringify(err)}`);
      console.log(err);
      return err;
    }
};

exports.completeUpload = async (req, res) => {
    log(`Proceed to complete the upload part for the image`);
    const userInfo = req.body.params.userInfo;
    const params = {
      Bucket: getBucketName(userInfo.libraryName),
      Key: String(getFileNameWithFolder(req.body.params.fileName, userInfo.libraryAccountKey)),
      UploadId: req.body.params.uploadId,
      MultipartUpload: {
        Parts: req.body.params.parts,
      }
        };
    const finalData = uploadImageProcess(params, req)
      .then((result) => {
        res.send({ result });
      })
      .catch((error) => {
        log(`completeUpload error ${JSON.stringify(error)}`);
        console.error(error);
      });
};



// function uploadImageProcess(params, req) {
//     log(`Proceed for Upload Image process`);
//     return new Promise((resolve, reject) =>
//       s3.completeMultipartUpload(params, (err, data) => {
//         if (err) {
//           log(`uploadImageProcess error ${JSON.stringify(err)}`);
//           reject(err);
//         } else {
//           if (data) {
//             const { userInfo, fileSize } = req.body.params;
//             const { Key } = data;
//             const {
//               libraryName,
//               librarySessionId,
//               libraryAccountKey,
//               librarySiteId,
//             } = userInfo;
//             const obj = {
//               title: "",
//               description: "",
//               libraryName,
//               librarySessionId,
//               libraryAccountKey,
//               librarySiteId,
//             };
//             /** Final Upload images on finerwork apis */
//             let intervalId;
//             const fileDetails = [
//               {
//                 fileSize: fileSize,
//                 fileName: Key,
//               },
//             ];
//             let counter = 0;
//             intervalId = setInterval(async () => {
//               const result = await checkImageUrls(
//                 fileDetails,
//                 intervalId,
//                 counter,
//                 libraryName,
//                 libraryAccountKey
//               );
//               if (result) {
//                 const files = fileDetails[0];
//                 const imageUrl = getImageUrl(libraryName, files.fileName, 'original', libraryAccountKey)
//                 const uploadedImages = {
//                   key: files.fileName,
//                   size: files.fileSize,
//                   location: `${imageUrl}`,
//                   bucket: getBucketName(libraryName),
//                   originalImage: files.fileName
//                 };
//                 log(`Prepared to upload Image details ${JSON.stringify(uploadedImages)}`);
//                 getImageUploaded(obj, uploadedImages).then((data) => {
//                   const resultData = {
//                     statusCode: 200,
//                     status: true,
//                     message: "Images has been uploaded successfully",
//                     guid: data.images[0].guid,
//                   };
//                   resolve(resultData);
//                 });
//               }
//             }, 5000);
//           }
//         }
//       })
//     );
// }


const uploadImageProcess = (params, req) => {
  log(`Proceed for Upload Image process`);
  console.log("params=========",params);
  return new Promise((resolve, reject) => {
    s3.completeMultipartUpload(params, async (err, data) => {
      if (err) {
        log(`uploadImageProcess error ${JSON.stringify(err)}`);
        return reject(err);
      }

      if (data) {
        const { userInfo, fileSize } = req.body.params;
        const { Key } = data;
        const {
          libraryName,
          librarySessionId,
          libraryAccountKey,
          librarySiteId,
        } = userInfo;

        const obj = {
          title: "",
          description: "",
          libraryName,
          librarySessionId,
          libraryAccountKey,
          librarySiteId,
        };

        const fileDetails = [
          {
            fileSize: fileSize,
            fileName: Key,
          },
        ];

        try {
          const result = await checkImageUrls(fileDetails, libraryName, libraryAccountKey);

          if (result) {
            const files = fileDetails[0];
            const imageUrl = getImageUrl(libraryName, files.fileName, 'original', libraryAccountKey);
            const uploadedImages = {
              key: files.fileName,
              size: files.fileSize,
              location: `${imageUrl}`,
              bucket: getBucketName(libraryName),
              originalImage: files.fileName
            };

            log(`Prepared to upload Image details ${JSON.stringify(uploadedImages)}`);
            const data = await getImageUploaded(obj, uploadedImages);
            console.log("data",data);
            const resultData = {
              statusCode: 200,
              status: true,
              message: "Images have been uploaded successfully",
              guid: data.images[0].guid,
              new1:true
            };
            log(`Prepared to upload Image SUCCESFULLY================== ${JSON.stringify(resultData)}`);

            resolve(resultData);
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

exports.completeUploadV2 = async (req, res) => {
  try {
    log(`Proceed to complete the upload part for the image`);
    const userInfo = req.body.params.userInfo;
    const params = {
      Bucket: getBucketName(userInfo.libraryName),
      Key: String(getFileNameWithFolder(req.body.params.fileName, userInfo.libraryAccountKey)),
      UploadId: req.body.params.uploadId,
      MultipartUpload: {
        Parts: req.body.params.parts,
      },
    };

    // Await the result of the uploadImageProcess function
    const result = await completeUploadSErviceV2(params);
    res.status(200).send({ result });
  } catch (error) {
    log(`completeUpload error ${JSON.stringify(error)}`);
    console.error(error);
    res.status(500).send({ error: 'Error in completing upload' });
  }
};

const completeUploadSErviceV2 = async (params) => {
  try {
    log(`Proceed for Upload Image process`);

    // Using Promisify for completeMultipartUpload since it's a callback-based function
    const data = await new Promise((resolve, reject) => {
      s3.completeMultipartUpload(params, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });

    // Handle successful upload
    log(`S3 Multipart Upload Completed. File Key: ${data.Key}`);
    return {
      success: true,
      message: 'Upload completed',
      fileKey: data.Key,
      bucket: data.Bucket,
    };

  } catch (error) {
    // Handle error in the try block
    log(`completeUpload error ${JSON.stringify(error)}`);
    throw new Error(error.message);
  }
};


exports.processUploadedImageV2 = async (req, res) => {
  try {
    const { userInfo, fileSize, fileKey } = req.body.params;
    const { libraryName, librarySessionId, libraryAccountKey, librarySiteId } = userInfo;

    const obj = {
      title: "",
      description: "",
      libraryName,
      librarySessionId,
      libraryAccountKey,
      librarySiteId,
    };

    const fileDetails = [{ fileSize, fileName: fileKey }];

    const result = await checkImageUrls(fileDetails, libraryName, libraryAccountKey);
    console.log("result=====================",result);
    // return;

    if (result) {
      const files = fileDetails[0];
      const imageUrl = getImageUrl(libraryName, files.fileName, 'original', libraryAccountKey);
      console.log("imageUrl============>>>>>>>>>>>>>",imageUrl);
      const uploadedImages = {
        key: files.fileName,
        size: files.fileSize,
        location: imageUrl,
        bucket: getBucketName(libraryName),
        originalImage: files.fileName,
      };

      log(`Prepared to upload Image details ${JSON.stringify(uploadedImages)}`);
      console.log("uploadedImages============>>>",uploadedImages);
      const data = await getImageUploaded(obj, uploadedImages);
      console.log("data=======",data);
      
      const resultData = {
        statusCode: 200,
        status: true,
        message: "Images have been uploaded successfully",
        guid: data.images[0].guid,
        new1: true,
      };

      log(`Image Processed Successfully ${JSON.stringify(resultData)}`);
      return res.status(200).json(resultData);
    } else {
      throw new Error("Invalid image or processing failed");
    }

  } catch (error) {
    log(`Error in processUploadedImage: ${error.message}`);
    return res.status(500).json({ status: false, message: error.message });
  }
};
