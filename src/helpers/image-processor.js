const sharp = require('sharp');
const axios = require('axios');
const AWS = require('aws-sdk');
const debug = require('debug');
const log = debug('app:image-processor');

// Configure Sharp for better memory management
sharp.cache(false); // Disable cache to reduce memory usage
sharp.concurrency(1); // Process one image at a time

const generateThumbnail = async (originalImageUrl, thumbnailKey, bucketName) => {
  try {
    console.log("enter in the thumbnail==========",thumbnailKey);
    
    const response = await axios.get(originalImageUrl, { responseType: 'arraybuffer' });
    console.log("response=========>>>>>>", response.data);
    
    // Log input image info with high pixel limit
    const imageInfo = await sharp(response.data, {
      limitInputPixels: 0 // 0 means no limit
    }).metadata();
    console.log('Input image metadata:', imageInfo);

    // Process image with optimized memory usage
    const thumbnailBuffer = await sharp(response.data, {
      failOnError: false, // Don't fail on corrupt images
      limitInputPixels: 0, // 0 means no limit for input pixels
      sequentialRead: true // Read image sequentially to reduce memory usage
    })
    .rotate() // Auto-rotate based on EXIF data
    .resize(200, 200, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
      kernel: 'lanczos3' // High-quality resampling
    })
    .jpeg({
      quality: 80,
      force: true, // Force JPEG output
      optimizeScans: true // Optimize JPEG encoding
    })
    .toBuffer({ resolveWithObject: true }); // Get output info

    console.log("thumbnailBuffer info=============<>>>><>", thumbnailBuffer.info);
    
    // Upload thumbnail to S3
    const s3 = new AWS.S3();
    const uploadParams = {
      Bucket: bucketName,
      Key: thumbnailKey,
      Body: thumbnailBuffer.data,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    };
    console.log("uploadParams=======+>>>>>", uploadParams);
    
    const result=await s3.upload(uploadParams).promise();
    console.log("result=======>>>>>",result);
    return result;
  } catch (error) {
    console.log('Error details in thumbnail generation:', {
      error: error.message,
      stack: error.stack
    });
    log('Error generating thumbnail:', error);
    return false;
  }
};

const generatePreview = async (originalImageUrl, previewKey, bucketName) => {
  try {
    // Download the original image
    const response = await axios.get(originalImageUrl, { responseType: 'arraybuffer' });
    
    // Log input image info with high pixel limit
    const imageInfo = await sharp(response.data, {
      limitInputPixels: 0 // 0 means no limit
    }).metadata();
    console.log('Preview input image metadata:', imageInfo);

    // Process image with optimized memory usage
    const previewBuffer = await sharp(response.data, {
      failOnError: false,
      limitInputPixels: 0,
      sequentialRead: true
    })
    .rotate() // Auto-rotate based on EXIF data
    .resize(1024, null, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: 'lanczos3'
    })
    .jpeg({
      quality: 85,
      force: true,
      optimizeScans: true
    })
    .toBuffer({ resolveWithObject: true });
    
    // Upload preview to S3
    const s3 = new AWS.S3();
    const uploadParams = {
      Bucket: bucketName,
      Key: previewKey,
      Body: previewBuffer.data,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    };
    
    const result2=await s3.upload(uploadParams).promise();
    console.log("result2================>>>",result2);
    return result2;
  } catch (error) {
    console.log('Error details in preview generation:', {
      error: error.message,
      stack: error.stack
    });
    log('Error generating preview:', error);
    return false;
  }
};

module.exports = {
  generateThumbnail,
  generatePreview
};