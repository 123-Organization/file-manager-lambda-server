const Jimp = require('jimp');
const debug = require('debug');
const log = debug('app:testImageResolution');
const sizeOf = require('image-size');
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

async function getCorrectedSize(width, height, orientation) {

    // Swap width and height if orientation requires it
    if (orientation && [5, 6, 7, 8].includes(orientation)) {
        [width, height] = [height, width];
    }

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

const testImageResolution = async (url) => {
    log(`start testing Image resolution ${JSON.stringify(url)}`);
    console.log("insidestep1");
    const imageBufferData = await getImageDataInBuffer(url);
    console.log("imageBufferData======>",imageBufferData);
    return imageBufferData
    console.log("insidestep1");
    console.log("insidestep2");

    const buffer = Buffer.from(imageBufferData, 'binary');
    console.log("insidestep2");

    try {
        console.log("insidestep3");
      const imageData = await getJimpInformation(buffer);
      console.log("insidestep3");

      log(`imageData is ${imageData}`);
      if(!imageData){
        log(`Reached to find other way to get width & height`);
        const dimensions = sizeOf(imageBufferData);
        const { width, height } = dimensions;
        log('Width:', width);
        log('Height:', height);
        return { width, height }
      } else{
        return imageData;
      }
    } catch (e) {
        log(`getting an error while check Image resolution ${JSON.stringify(e)}`);
        console.log("getting an error while check Image resolution", JSON.stringify(e));
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
