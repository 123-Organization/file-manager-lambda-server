const { Router } = require('express');
const { getAllImages } = require('./get-all-images');
const { updateImage } = require('./update-image');
const { deleteImage } = require('./delete-image');
const { startUploadImages, getUploadUrl, completeUpload, saveImage,completeUploadV2,processUploadedImageV2 } = require('./upload-image');
const { printImages } = require('./print-image');
const { getListFileSelection } = require('./get-list-file-selection');
const { webhookArtzipUpload } = require('./webhook-artzip-upload');
const { getMyCredentials } = require('./get-my-credentials');
const { uploadImageByURL } = require('./upload-image-by-url');
const app = Router();
app.post('/getallimages',getAllImages);
app.put('/updateimage',updateImage);
app.delete('/deleteimage',deleteImage); 
app.get('/start-upload',startUploadImages);
app.get('/get-upload-url',getUploadUrl);
app.post('/complete-upload',completeUpload);
app.post('/printimages',printImages);
app.post('/get-list-file-selection',getListFileSelection);
app.post('/saveimages',saveImage);
app.post('/getmycredentials',getMyCredentials);
app.post('/webhook-artzip-upload', webhookArtzipUpload);
app.post('/uploadimageurl',uploadImageByURL);
app.post('/complete-uploadV2',completeUploadV2);
app.post('/final-upload',processUploadedImageV2);


module.exports = app;