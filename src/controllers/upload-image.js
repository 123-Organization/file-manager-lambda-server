const AWS = require("aws-sdk");
const sharp = require('sharp');
const { pdf } = require('pdf-to-img');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const getBucketName = require('../helpers/get-bucket-name');
const getFileNameWithFolder = require('../helpers/get-file-name-with-folder');
const getImageUrl = require('../helpers/get-image-url');
const checkImageUrls = require('../helpers/check-image-url-existence');
// const getImageUploaded = require('../helpers/get-image-upload');
const { getImageUploaded, getImageUploadedv2 } = require('../helpers/get-image-upload');

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

exports.startUploadImagesV2 = (req, res) => {
  log('start upload image for SVG');
  const bucketName = getBucketName(req.query.fileLibrary);
  console.log("bucketName",bucketName);

  const fileType = req.query.fileType;  // Get the file type from the request
  console.log("fileType===============>>>>>>", fileType);
  try {
    // Ensure the file type is SVG
    if (fileType !== 'image/svg+xml') {
      return res.status(400).send({ error: 'Only SVG files are supported in this version' });
    }
    let params = {
      Bucket: bucketName,
      Tagging: req.query.basecampProjectID,
      ACL: "public-read",
    };
    console.log("params",params);

    // Step 1: Handle SVG - raw upload
    params.ContentType = 'image/svg+xml';
    const svgFileName = `${getFileNameWithFolder(req.query.fileName, req.query.libraryAccountKey)}`;
    console.log("svgFileName=========>>>>>>", svgFileName);
    
    // Start the raw SVG file upload
    s3.createMultipartUpload({ ...params, Key: svgFileName }, (err, svgUploadData) => {
      if (err) {
        return res.status(500).send({ error: 'Error starting SVG upload', details: err });
      }

      // Return the upload ID for the SVG
      return res.send({
        svgUploadId: svgUploadData.UploadId,
        message: 'SVG upload started successfully.',
      });
    });
  } catch (err) {
    log(`startUploadImagesV2 error ${JSON.stringify(err)}`);
    console.log(err);
    return res.status(500).send({ error: 'Unexpected error', details: err });
  }
};


exports.startBulkUploadPdfImages = (req, res) => {
  log('start bulk upload images');
  
  // Accept array of objects from the request body
  const files = req.body;

  // Validate the input array
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).send({ error: 'Invalid input: Array of files is required' });
  }

  // Process each file in the array
  const uploadPromises = files.map((file) => {
    const bucketName = getBucketName(file.fileLibrary);
    
    const params = {
      Bucket: bucketName,
      Key: getFileNameWithFolder(file.fileName, file.libraryAccountKey),
      ContentType: 'application/pdf',
      Tagging: file.basecampProjectID,
      ACL: "public-read",
      Metadata: {
        'original-filename': file.fileName
      }
    };

    return new Promise((resolve, reject) => {
      s3.createMultipartUpload(params, (err, uploadData) => {
        if (err) {
          reject(err);
        } else {
          resolve({ fileName: file.fileName, uploadId: uploadData.UploadId });
        }
      });
    });
  });

  // Wait for all uploads to complete
  Promise.all(uploadPromises)
    .then((uploadResults) => {
      // Send all the uploadIds for the files
      res.send({ uploads: uploadResults });
    })
    .catch((err) => {
      log(`startBulkUploadImages error ${JSON.stringify(err)}`);
      console.log(err);
      res.status(500).send({ error: 'Failed to upload files', details: err });
    });
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


exports.getUploadUrlPdf = async (req, res) => {
  log(`Get upload url`);

  // Extract the payload array from the request body
  const payload = req.body;

  try {
    // Initialize an empty array to hold the promises for each presigned URL
    const promises = payload.map((item) => {
      const { uploadId, fileName, partNumber, fileLibrary, libraryAccountKey } = item;

      const bucketName = getBucketName(fileLibrary); // Get bucket name from fileLibrary
      let params = {
        Bucket: bucketName,
        Key: String(getFileNameWithFolder(fileName, libraryAccountKey)), // Generate file key
        UploadId: uploadId,
        PartNumber: partNumber,
      };

      // Return a promise for each presigned URL
      return new Promise((resolve, reject) => {
        s3.getSignedUrl("uploadPart", params, (err, presignedUrl) => {
          if (err) {
            reject(err);
          } else {
            resolve({ uploadId, presignedUrl });
          }
        });
      });
    });

    // Wait for all promises to resolve concurrently
    const presignedUrls = await Promise.all(promises);

    // Send the response with the array of presigned URLs
    res.send({ presignedUrls });
  } catch (err) {
    log(`getUploadUrl error ${JSON.stringify(err)}`);
    console.log(err);
    return res.status(500).send({ error: 'Failed to generate presigned URLs' });
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

exports.completeUploadV2WithConversion = async (req, res) => {
  try {
    log(`Proceed to complete the upload part for SVG image with PNG conversion`);
    const userInfo = req.body.params.userInfo;
    const { uploadId, fileName, folderPath } = req.body.params;
    console.log("fileName==================",fileName);
    const extractedFilename=extractImageName(fileName);
    console.log("extractedFilename==================",extractedFilename);
    
    const params = {
      Bucket: getBucketName(userInfo.libraryName),
      Key: String(getFileNameWithFolder(fileName, userInfo.libraryAccountKey)),
      UploadId: uploadId,
      MultipartUpload: {
        Parts: req.body.params.parts,
      },
    };

    // Complete the multipart upload for SVG
    const uploadResult = await completeUploadSErviceV2(params);
    console.log("uploadResult=======>>>>",uploadResult);
    
    if (uploadResult.success) {
      // Convert SVG to PNG and upload both files
      const conversionResult = await convertSvgToPngAndUpload(params, userInfo, fileName, folderPath);
      console.log("conversionResult==========>>>>>>>",conversionResult);
      
      // Update Fineworks API with both SVG and PNG files
      const apiResult = await updateFineworksAPIWithBothFiles(userInfo, fileName, folderPath, conversionResult,extractedFilename);
      console.log("apiResult",apiResult);
      
      res.status(200).json({
        statusCode: 200,
        status: true,
        message: "SVG upload completed with PNG conversion",
        svgFile: uploadResult.fileKey,
        pngFile: conversionResult.pngKey,
        guid: apiResult.images[0].guid
      });
    } else {
      throw new Error("Failed to complete SVG upload");
    }
    
  } catch (error) {
    log(`completeUploadV2WithConversion error ${JSON.stringify(error)}`);
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
};

const convertSvgToPngAndUpload = async (params, userInfo, fileName, folderPath) => {
  try {
    const bucketName = getBucketName(userInfo.libraryName);
    
    // Download the SVG file from S3
    const svgObject = await s3.getObject({
      Bucket: bucketName,
      Key: params.Key
    }).promise();
    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(svgObject.Body)
      .png()
      .toBuffer();
    
    // Create PNG filename (same name, different extension)
    const pngFileName = fileName.replace(/\.svg$/i, '.png');
    const pngKey = String(getFileNameWithFolder(pngFileName, userInfo.libraryAccountKey));
    
    // Upload PNG to S3
    await s3.putObject({
      Bucket: bucketName,
      Key: pngKey,
      Body: pngBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }).promise();
    
    log(`PNG conversion and upload completed: ${pngKey}`);
    
    return {
      pngKey: pngKey,
      pngFileName: pngFileName,
      pngSize: pngBuffer.length
    };
    
  } catch (error) {
    log(`Error in SVG to PNG conversion: ${JSON.stringify(error)}`);
    throw new Error(`SVG to PNG conversion failed: ${error.message}`);
  }
};

const updateFineworksAPIWithBothFiles = async (userInfo, fileName, folderPath, conversionResult,extractedFilename) => {
  try {
    const { libraryName, librarySessionId, libraryAccountKey, librarySiteId } = userInfo;
    
    // Get file sizes for both files
    const bucketName = getBucketName(libraryName);
    
    // Get SVG file size
    const svgKey = String(getFileNameWithFolder(fileName, libraryAccountKey));
    const svgObject = await s3.headObject({
      Bucket: bucketName,
      Key: svgKey
    }).promise();
    
    // Get PNG file size
    const pngObject = await s3.headObject({
      Bucket: bucketName,
      Key: conversionResult.pngKey
    }).promise();
    
    // Create payload for Fineworks API with both files
    const obj = {
      title: "",
      description: "",
      libraryName,
      librarySessionId,
      libraryAccountKey,
      librarySiteId,
    };
    
    // SVG file details
    const svgImageUrl = getImageUrl(libraryName, svgKey, 'original', libraryAccountKey);
    const svgUploadedImages = {
      key: svgKey,
      size: svgObject.ContentLength,
      location: svgImageUrl,
      bucket: bucketName,
      originalImage: fileName
    };
    console.log("svgImageUrl=========>>>>>>>",svgImageUrl);
    
    // PNG file details
    const pngImageUrl = getImageUrl(libraryName, conversionResult.pngKey, 'original', libraryAccountKey);
    const pngUploadedImages = {
      key: conversionResult.pngKey,
      size: pngObject.ContentLength,
      location: pngImageUrl,
      bucket: bucketName,
      originalImage: conversionResult.pngFileName
    };

    console.log("svgImageUrl=========>>>>>>>",svgImageUrl);


    // Upload SVG to Fineworks API
// const svgResult = await getImageUploaded(obj, svgUploadedImages);
    
    // Upload PNG to Fineworks API
    const pngResult = await getImageUploadedv2(obj, pngUploadedImages,svgImageUrl,extractedFilename);
    
    log(`Both SVG and PNG files uploaded to Fineworks API successfully`);
    
    // Return the SVG result (or you could return both if needed)
    return pngResult;
    
  } catch (error) {
    log(`Error updating Fineworks API: ${JSON.stringify(error)}`);
    throw new Error(`Failed to update Fineworks API: ${error.message}`);
  }
};

const updateFineworksAPIWithBothFilesForPdf = async (userInfo, fileName, folderPath, conversionResult, extractedFilename) => {
  try {
    const { libraryName, librarySessionId, libraryAccountKey, librarySiteId } = userInfo;
    
    // Get file sizes for both files
    const bucketName = getBucketName(libraryName);
    
    // Get PDF file size
    const pdfKey = String(getFileNameWithFolder(fileName, libraryAccountKey));
    const pdfObject = await s3.headObject({
      Bucket: bucketName,
      Key: pdfKey
    }).promise();
    
    // Get PNG file size
    const pngObject = await s3.headObject({
      Bucket: bucketName,
      Key: conversionResult.pngKey
    }).promise();
    
    // Create payload for Fineworks API with both files
    const obj = {
      title: "",
      description: "",
      libraryName,
      librarySessionId,
      libraryAccountKey,
      librarySiteId,
    };
    
    // PDF file details
    const pdfImageUrl = getImageUrl(libraryName, pdfKey, 'original', libraryAccountKey);
    const pdfUploadedImages = {
      key: pdfKey,
      size: pdfObject.ContentLength,
      location: pdfImageUrl,
      bucket: bucketName,
      originalImage: fileName,
      contentType: 'application/pdf'
    };
    console.log("pdfImageUrl=========>>>>>>>",pdfImageUrl);
    
    // PNG file details
    const pngImageUrl = getImageUrl(libraryName, conversionResult.pngKey, 'original', libraryAccountKey);
    const pngUploadedImages = {
      key: conversionResult.pngKey,
      size: pngObject.ContentLength,
      location: pngImageUrl,
      bucket: bucketName,
      originalImage: conversionResult.pngFileName,
      contentType: 'image/png'
    };

    console.log("pngImageUrl=========>>>>>>>",pngImageUrl);

    // Upload both files to Fineworks API
    const result = await getImageUploadedv2(obj, pngUploadedImages, pdfImageUrl, extractedFilename);
    
    log(`Both PDF and PNG files uploaded to Fineworks API successfully`);
    
    return result;
    
  } catch (error) {
    log(`Error updating Fineworks API: ${JSON.stringify(error)}`);
    throw new Error(`Failed to update Fineworks API: ${error.message}`);
  }
};

function extractImageName(data) {
  const fullFileName = data; // No need to split by '/'
  // Extract the part after the last '__' and return it
  const fileName = fullFileName.split('__').pop(); // Split by '__' and get the last part
  return fileName;
}

const generatePresignedUrl = async (bucketName, key) => {
  const params = { 
    Bucket: bucketName, 
    Key: key, 
    Expires: 60 // Expires in 60 seconds
  };
  
  return s3.getSignedUrl('getObject', params);
};
// const convertPdfToPngAndUpload = async (params, userInfo, fileName, folderPath) => {
//   try {
//     const bucketName = getBucketName(userInfo.libraryName);
    
//     // Download the file from S3
//     // const fileObject = await s3.getObject({
//     //   Bucket: bucketName,
//     //   Key: params.Key
//     // }).promise();

//         const url = await generatePresignedUrl(bucketName, params.Key);

//     // Use the URL to download the file via HTTP request (with fetch, axios, etc.)
//     const response = await fetch(url);
//     const arrayBuffer = await response.arrayBuffer(); // Use arrayBuffer() instead of buffer()
//     const fileBuffer = Buffer.from(arrayBuffer); // Co    console.log("fileObject====>>>",response);
//     console.log("fileBuffer+++++++",fileBuffer);
//     let pngBuffer;
    
//     // Check if the file is already a PNG by looking at magic numbers
//     const isPNG = fileObject.Body[0] === 0x89 && 
//                   fileObject.Body[1] === 0x50 && 
//                   fileObject.Body[2] === 0x4E && 
//                   fileObject.Body[3] === 0x47;

//     if (isPNG) {
//       // If it's already a PNG, use it directly
//       pngBuffer = fileObject.Body;
//       console.log("File is already a PNG, using it directly");
//     } else {
//       try {
//         console.log("Starting PDF to PNG conversion using pdf-to-img");
        
//         // Create temporary directory for PDF processing
//         const tempDir = path.join(os.tmpdir(), 'pdf-conversion-' + Date.now());
//         await fs.mkdir(tempDir, { recursive: true });

//         try {
//           // Save PDF to temp file
//           const tempPdfPath = path.join(tempDir, 'input.pdf');
//           await fs.writeFile(tempPdfPath, fileObject.Body);
          
//           console.log("Converting PDF to images...");
          
//           // Convert PDF to images using pdf-to-img
//           const convert = await pdf(tempPdfPath, {
//             scale: 3.0 // Higher scale for better quality
//           });
          
//           // Get the first page as PNG
//           let result;
//           for await (const image of convert) {
//             result = image; // Get the first image
//             break;
//           }
          
//           if (!result) {
//             throw new Error("PDF conversion failed: No output generated");
//           }
          
//           console.log("PDF converted successfully, optimizing with Sharp...");
          
//           // Optimize the PNG with Sharp
//           pngBuffer = await sharp(result)
//             .resize(2000, 2000, {
//               fit: 'inside',
//               withoutEnlargement: true
//             })
//             .png({
//               quality: 75,
//               progressive: true,
//               compressionLevel: 9
//             })
//             .toBuffer();
          
//           console.log(`PDF to PNG conversion completed. PNG size: ${pngBuffer.length} bytes`);
          
//         } finally {
//           // Clean up temp directory
//           await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
//         }
        
//       } catch (conversionError) {
//         console.error('PDF conversion error:', conversionError);
//         throw new Error(`PDF conversion failed: ${conversionError.message}`);
//       }
//     }
    
//     // Create PNG filename (same name, different extension)
//     const pngFileName = fileName.replace(/\.(pdf|png)$/i, '.png');
//     const pngKey = String(getFileNameWithFolder(pngFileName, userInfo.libraryAccountKey));
    
//     // Upload PNG to S3
//     await s3.putObject({
//       Bucket: bucketName,
//       Key: pngKey,
//       Body: pngBuffer,
//       ContentType: 'image/png',
//       ACL: 'public-read'
//     }).promise();
    
//     log(`File processing and upload completed: ${pngKey}`);
    
//     return {
//       pngKey: pngKey,
//       pngFileName: pngFileName,
//       pngSize: pngBuffer.length
//     };
    
//   } catch (error) {
//     console.error('PDF to PNG conversion error:', error);
//     throw new Error(`PDF to PNG conversion failed: ${error.message}`);
//   }
// };



const convertPdfToPngAndUpload = async (params, userInfo, fileName, folderPath) => {
  try {
    const bucketName = getBucketName(userInfo.libraryName);

    // Generate the presigned URL for downloading the file from S3
    const url = await generatePresignedUrl(bucketName, params.Key);

    // Use the URL to download the file via HTTP request (with fetch)
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer(); // Use arrayBuffer() instead of buffer()
    const fileBuffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer

    let pngBuffer;

    // Check if the file is already a PNG
    const isPNG = fileBuffer[0] === 0x89 && 
                  fileBuffer[1] === 0x50 && 
                  fileBuffer[2] === 0x4E && 
                  fileBuffer[3] === 0x47;

    if (isPNG) {
      pngBuffer = fileBuffer; // Use the PNG directly
    } else {
      try {
        console.log("Starting PDF to PNG conversion using pdf-to-img");

        // Create temporary directory for PDF processing
        const tempDir = path.join(os.tmpdir(), 'pdf-conversion-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        try {
          // Save PDF to temp file
          const tempPdfPath = path.join(tempDir, 'input.pdf');
          await fs.writeFile(tempPdfPath, fileBuffer);

          console.log("Converting PDF to images...");
          
          // Convert PDF to images using pdf-to-img
          const convert = await pdf(tempPdfPath, {
            scale: 3.0 // Higher scale for better quality
          });

          // Get the first page as PNG
          let result;
          for await (const image of convert) {
            result = image; // Get the first image
            break;
          }

          if (!result) {
            throw new Error("PDF conversion failed: No output generated");
          }

          console.log("PDF converted successfully, optimizing with Sharp...");

          // Optimize the PNG with Sharp
          pngBuffer = await sharp(result)
            .resize(3000, 3000, { 
              fit: 'inside',
              withoutEnlargement: true,
              kernel: 'lanczos3'
            })
            .png({
              quality: 100,
              progressive: true,
              compressionLevel: 6,
              force: true
            })
            .toBuffer();

          console.log(`PDF to PNG conversion completed. PNG size: ${pngBuffer.length} bytes`);
        } finally {
          // Clean up temp directory
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
      } catch (conversionError) {
        console.error('PDF conversion error:', conversionError);
        throw new Error(`PDF conversion failed: ${conversionError.message}`);
      }
    }

    // Create PNG filename and upload to S3
    const pngFileName = fileName.replace(/\.(pdf|png)$/i, '.png');
    const pngKey = getFileNameWithFolder(pngFileName, userInfo.libraryAccountKey);

    await s3.putObject({
      Bucket: bucketName,
      Key: pngKey,
      Body: pngBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }).promise();

    console.log(`File processing and upload completed: ${pngKey}`);

    return { pngKey, pngFileName, pngSize: pngBuffer.length };
  } catch (error) {
    console.error('PDF to PNG conversion error:', error);
    throw new Error(`PDF to PNG conversion failed: ${error.message}`);
  }
};

exports.completeUploadV2WithPdfConversion = async (req, res) => {
  try {
    log(`Proceed to complete the upload part for PDF with PNG conversion`);
    const userInfo = req.body.params.userInfo;
    const { uploadId, fileName, folderPath } = req.body.params;
    console.log("fileName==================",fileName);
    const extractedFilename = extractImageName(fileName);
    console.log("extractedFilename==================",extractedFilename);
    
    const params = {
      Bucket: getBucketName(userInfo.libraryName),
      Key: String(getFileNameWithFolder(fileName, userInfo.libraryAccountKey)),
      UploadId: uploadId,
      MultipartUpload: {
        Parts: req.body.params.parts,
      },
    };

    // Complete the multipart upload for PDF
    const uploadResult = await completeUploadSErviceV2(params);
    console.log("uploadResult=======>>>>",uploadResult);
    
    if (uploadResult.success) {
      // Convert PDF to PNG and upload both files
      const conversionResult = await convertPdfToPngAndUpload(params, userInfo, fileName, folderPath);
      console.log("conversionResult==========>>>>>>>",conversionResult);
      
      // Update Fineworks API with both PDF and PNG files
      const apiResult = await updateFineworksAPIWithBothFilesForPdf(userInfo, fileName, folderPath, conversionResult, extractedFilename);
      console.log("apiResult",apiResult);
      
      res.status(200).json({
        statusCode: 200,
        status: true,
        message: "PDF upload completed with PNG conversion",
        pdfFile: uploadResult.fileKey,
        pngFile: conversionResult.pngKey,
        guid: apiResult.images[0].guid
      });
    } else {
      throw new Error("Failed to complete PDF upload");
    }
    
  } catch (error) {
    log(`completeUploadV2WithPdfConversion error ${JSON.stringify(error)}`);
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
};

const convertEpsToPdfAndUpload = async (params, userInfo, fileName, folderPath) => {
  try {
    log(`Starting EPS to PDF conversion process`);
    
    // Download the EPS file from S3
    const epsFile = await s3.getObject({
      Bucket: params.Bucket,
      Key: params.Key
    }).promise();

    // Create a temporary directory for processing
    const tempDir = path.join(os.tmpdir(), 'eps-conversion-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Save EPS file locally
    const epsPath = path.join(tempDir, 'input.eps');
    await fs.writeFile(epsPath, epsFile.Body);

    // Convert EPS to PDF using Ghostscript
    const pdfPath = path.join(tempDir, 'output.pdf');
    await new Promise((resolve, reject) => {
      exec(`gs -dNOPAUSE -dBATCH -dSAFER -sDEVICE=pdfwrite -dEPSCrop -dCompatibilityLevel=1.7 -dPDFSETTINGS=/prepress -r300 -dColorImageResolution=300 -dGrayImageResolution=300 -dMonoImageResolution=300 -sOutputFile=${pdfPath} ${epsPath}`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Validate PDF conversion
    const pdfContent = await fs.readFile(pdfPath);
    if (!pdfContent || pdfContent.length < 100) {
      throw new Error('EPS to PDF conversion failed: Output file is too small or empty');
    }

    // Check if the PDF starts with the PDF magic number
    if (pdfContent.toString('ascii', 0, 4) !== '%PDF') {
      throw new Error('EPS to PDF conversion failed: Invalid PDF output');
    }

    // Upload PDF to S3
    const pdfKey = params.Key.replace(/\.eps$/i, '.pdf');
    await s3.putObject({
      Bucket: params.Bucket,
      Key: pdfKey,
      Body: pdfContent
    }).promise();

    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      success: true,
      pdfKey: pdfKey
    };
  } catch (error) {
    log(`EPS to PDF conversion failed: ${error.message}`);
    throw new Error(`EPS to PDF conversion failed: ${error.message}`);
  }
};

exports.completeUploadV2WithEpsConversion = async (req, res) => {
  try {
    log(`Proceed to complete the upload part for EPS with PDF and PNG conversion`);
    const userInfo = req.body.params.userInfo;
    const { uploadId, fileName, folderPath } = req.body.params;
    console.log("fileName==================",fileName);
    const extractedFilename = extractImageName(fileName);
    console.log("extractedFilename==================",extractedFilename);
    
    const params = {
      Bucket: getBucketName(userInfo.libraryName),
      Key: String(getFileNameWithFolder(fileName, userInfo.libraryAccountKey)),
      UploadId: uploadId,
      MultipartUpload: {
        Parts: req.body.params.parts,
      },
    };

    // Complete the multipart upload for EPS
    const uploadResult = await completeUploadSErviceV2(params);
    console.log("uploadResult=======>>>>",uploadResult);
    
    if (uploadResult.success) {
      // First convert EPS to PDF
      const pdfConversionResult = await convertEpsToPdfAndUpload(params, userInfo, fileName, folderPath);
      console.log("pdfConversionResult==========>>>>>>>",pdfConversionResult);

      // Create new params for PDF to PNG conversion
      const pdfParams = {
        ...params,
        Key: pdfConversionResult.pdfKey
      };
      
      // Then convert PDF to PNG
      const pngConversionResult = await convertPdfToPngAndUpload(pdfParams, userInfo, fileName.replace(/\.eps$/i, '.pdf'), folderPath);
      console.log("pngConversionResult==========>>>>>>>",pngConversionResult);
      
      // Update Fineworks API with EPS, PDF and PNG files
      const apiResult = await updateFineworksAPIWithBothFilesForPdf(userInfo, fileName, folderPath, pngConversionResult, extractedFilename);
      console.log("apiResult",apiResult);
      
      res.status(200).json({
        statusCode: 200,
        status: true,
        message: "EPS upload completed with PDF and PNG conversion",
        epsFile: uploadResult.fileKey,
        pdfFile: pdfConversionResult.pdfKey,
        pngFile: pngConversionResult.pngKey,
        guid: apiResult.images[0].guid
      });
    } else {
      throw new Error("Failed to complete EPS upload");
    }
    
  } catch (error) {
    log(`completeUploadV2WithEpsConversion error ${JSON.stringify(error)}`);
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
};