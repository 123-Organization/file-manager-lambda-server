const Jimp = require('jimp');
const debug = require('debug');
const log = debug('app:testImageResolution');
const probe = require('probe-image-size');
const https = require('https');
const http = require('http');
const axios = require('axios');
// for processing the large Image
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
// Function to download the image from URL
// async function downloadImage(url) {
//     try {
//         const response = await axios.get(url, { responseType: 'stream' });
//         return response;
//     } catch (error) {
//         throw new Error(`Error downloading image: ${error.message}`);
//     }
// }
// Function to check image size and EXIF orientation
// const testImageResolutions = async (url) => {
//     try {
//         log(`Download the image ${JSON.stringify(url)}`);
//         // Download the image
//         const response = await downloadImage(url);
//         const metadata = await new Promise((resolve, reject) => {
//             pipelineAsync(
//               response.data,
//               sharp().metadata((err, metadata) => {
//                 if (err) reject(err);
//                 resolve(metadata);
//               })
//             ).catch(reject);
//         });
//         const { width, height } = getCorrectedSize(metadata);
//         log(`Image size: ${width}x${height}`);
//         return {
//             width,
//             height
//         }
        
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// async function getCorrectedSize(width, height, orientation) {

//     // Swap width and height if orientation requires it
//     if (orientation && [5, 6, 7, 8].includes(orientation)) {
//         [width, height] = [height, width];
//     }

//     return { width, height };
// }


async function getCorrectedSize(width, height, orientation) {
    // EXIF orientation values:
    // 1 = Normal (0°)
    // 2 = Flipped horizontally
    // 3 = Rotated 180°
    // 4 = Flipped vertically
    // 5 = Rotated 90° CCW and flipped horizontally
    // 6 = Rotated 90° CW
    // 7 = Rotated 90° CW and flipped horizontally  
    // 8 = Rotated 90° CCW (or 270° CW)

    if (!orientation || orientation === 1) {
        // Normal orientation, no changes needed
        return { width, height };
    }

    // Orientations 5, 6, 7, 8 require swapping width and height
    // because the image is rotated 90° or 270°
    if ([5, 6, 7, 8].includes(orientation)) {
        // console.log(EXIF orientation ${orientation} detected: swapping width/height);
        return { width: height, height: width };
    }

    // Orientations 2, 3, 4 don't require dimension swapping
    // (they're flips or 180° rotation)
    // console.log(EXIF orientation ${orientation} detected: keeping original dimensions);
    return { width, height };
}
// async function getImageDataInBuffer(url) {
//     try {
//         const response = await axios.get(url, {
//             responseType: 'arraybuffer'
//         });

//         // The image data will be available in response.data as a Buffer
//         return response.data;
//     } catch (error) {
//         console.error('Error fetching image data:', error);
//         throw error; // Handle or propagate the error as needed
//     }
// }
// async function getImageDataInBuffer(url) {
//     try {
//         const response = await axios.get(url, {
//             responseType: 'arraybuffer'
//         });

//         // The image data will be available in response.data as a Buffer
//         return response.data;
//     } catch (error) {
//         console.error('Error fetching image data:', error);
//         throw error; // Handle or propagate the error as needed
//     }
// }

async function getImageDataInBuffer(url) {
    const protocol = url.startsWith('https') ? https : http; // Check the protocol (http or https)

    return new Promise((resolve, reject) => {
      protocol.get(url, (res) => {
        probe(res)
          .then(dimensions => resolve(dimensions))
          .catch(err => reject(err));
      }).on('error', reject);
    });
}


async function getImageHeadersOnly(url) {
    const protocol = url.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
        protocol.get(url, (res) => {
            // Use probe-image-size which reads only headers, not full image
            probe(res)
                .then(dimensions => {
                    res.destroy(); // Stop downloading immediately after headers
                    resolve(dimensions);
                })
                .catch(err => {
                    res.destroy();
                    reject(err);
                });
        }).on('error', reject);
    });
}

// const testImageResolution = async (url) => {
//     log(`start testing Image resolution ${JSON.stringify(url)}`);
//     console.log("insidestep1");
//     const imageBufferData = await getImageDataInBuffer(url);
//     console.log("imageBufferData======>",imageBufferData);
//     return imageBufferData
// }

const testImageResolution = async (url) => {
    console.log(" Fast header-only processing...");
    
    try {
        // Use probe-image-size - only reads image headers, not full file!
        const imageInfo = await getImageHeadersOnly(url);
        console.log(" Image info from headers:", imageInfo);
        
        let { width, height } = imageInfo;
        const orientation = imageInfo.orientation || imageInfo.exif?.Orientation;
        
        console.log("🔍 EXIF orientation found:", orientation);
        
        if (orientation) {
            // Apply orientation correction without downloading full image
            const correctedSize = await getCorrectedSize(width, height, orientation);
            return {
                width: correctedSize.width,
                height: correctedSize.height,
                hasExif: true,
                orientation: orientation,
                originalWidth: width,
                originalHeight: height
            };
        } else {
            return {
                width,
                height,
                hasExif: false
            };
        }
        
    } catch (error) {
        console.log("Error details:", error);
        
        // Ultra-light fallback - just get basic dimensions
        try {
            console.log("🔄 Fallback: basic probe without EXIF...");
            const basicInfo = await getImageHeadersOnly(url);
            return {
                width: basicInfo.width,
                height: basicInfo.height,
                hasExif: false,
                fallback: true
            };
        } catch (fallbackError) {
            console.log(" All methods failed:", fallbackError);
            throw new Error(`Could not get image dimensions: ${fallbackError.message}`);
        }
    }
}




async function getJimpInformation(buffer){
    try {
        const image = await Jimp.read(buffer);
        // Get width and height
        const width = image.getWidth();
        const height = image.getHeight();
        if(image){
            log('jimpp readed the image details successfully');
        }
        // Get EXIF orientation if available
        const exifOrientation = image.exif && image.exif.Orientation;
        if(exifOrientation){
        const {width, height} =  await getCorrectedSize(width, height, exifOrientation);
        return {  width, height }
        } else{
        return {  width, height }
        }
    }catch(err){
        log(err);
    }
    
}
module.exports = testImageResolution;
