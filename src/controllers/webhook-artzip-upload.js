const debug = require('debug');
const log = debug('app:webhookArtzipUpload');
const getBucketName = require('../helpers/get-bucket-name');
const getImageUploaded = require('../helpers/get-image-upload');
const fs = require('fs');
exports.webhookArtzipUpload = async (req, res) => {
    const artZipToken = process.env.ARTZIP_TOKEN;
    const artzipId = process.env.ARTZIP_ID;
    log(`Start uploading image from artzip`);
    if (req.body.image) {
      const {
        image: { url, byte_size }, metadata, name
      } = req.body;
      console.log("req.body", req.body);
      const imageUrl = url;
      const headers = {
        'Authorization': `Bearer token=${artZipToken}, id=${artzipId}`
      };
      axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream',
        headers: headers,
      })
        .then((response) => {
          const randomNumber = `${Date.now()}__${Math.round(Math.random() * 1E9)}`;
          const fileName = `${randomNumber}.jpg`;
          const imageStream = fs.createWriteStream(fileName);
          response.data.pipe(imageStream);
          response.data.on('end', () => {
            const contentType = 'image/jpeg';
            const params = {
              Bucket: getBucketName(metadata.name),
              Key: `${metadata.account_key}/${randomNumber}/${fileName}`,
              Body: fs.createReadStream(fileName),
              ACL: 'public-read',
              ContentType: contentType,
            };
            // Upload the image to S3
            s3.upload(params, (err, data) => {
              if (err) {
                log('Error uploading image to S3:', err);
                console.error('Error uploading image to S3:', err);
              } else {
                log(`Image from artzip uploaded to s3 bucket. Location is ${data.Location}`);
                const obj = {
                  title: name,
                  description: '',
                  libraryName: metadata.name,
                  librarySessionId: metadata.session_id,
                  libraryAccountKey: metadata.account_key,
                  librarySiteId: metadata.site_id
                }
                const uploadedImages = {
                  location: data.Location,
                  key: `${metadata.account_key}/${randomNumber}/${fileName}`,
                  bucket: getBucketName(metadata.name),
                  size: byte_size,
                  originalImage: fileName
                }
                getImageUploaded(obj, uploadedImages).then((data) => {
                  fs.unlinkSync(fileName);
                  res.status(200).json({
                    statusCode: 200,
                    status: true,
                    guid: data.images[0].guid,
                    message: "Images has been uploaded successfully",
                  });
                });
              }
            });
            // Error handling
            response.data.on('error', (err) => {
              log(`Image from artzip return error. Error is ${JSON.stringify(err)}`)
              console.error('Error:', err);
              // Handle the error appropriately, e.g., log it, throw it, etc.
            });
          });
        })
        .catch((error) => {
          log(`Image from artzip return error. Error is ${JSON.stringify(error)}`)
          console.error('Error fetching image:', error);
        });
    }
  
  };