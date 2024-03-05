const axios = require('axios');
/** Common header settings for all the finer work apis */
const getHeaders = () =>{
    return {
        'web_api_key':process.env.FINER_WORKS_WEB_API_KEY,
        'app_key':process.env.FINER_WORKS_APP_KEY
    };
};


/** To add the image & its details in finer work apis */
exports.POST_IMAGE = async(payload) => {
    try {
        const postData = await axios({
          method: 'post',
          url: process.env.FINER_WORKS_URL + '/add_images',
          headers: getHeaders(),
          data: payload
        });
        // Handle successful response here
        console.log('Response:', postData.data);
        return postData.data;
      } catch (error) {
        // Handle errors here
        console.error('Error:', JSON.stringify(error));
      }
};


/** Get the list of all the records from finer works */
exports.LIST_IMAGE = async(payload) => {
  const getData = await axios({
    method: 'post',
    url: process.env.FINER_WORKS_URL+'/list_images',
    headers: getHeaders(),
    data: payload
  });
  return getData.data;
};

/** Update Image details */
exports.UPDATE_IMAGE = async(payload) => {
  const updateData = await axios({
    method: 'put',
    url: process.env.FINER_WORKS_URL+'/update_images',
    headers: getHeaders(),
    data: payload
  });
  return updateData.data;
};

/** Delete Image details */
exports.DELETE_IMAGE = async(payload) => {
  const deleteData = await axios({
    method: 'delete',
    url: process.env.FINER_WORKS_URL+'/delete_images',
    headers: getHeaders(),
    data: payload
  });
  return deleteData.data;
};

/** Print one */
exports.UPDATE_LIST_IMAGE_FOR_PRINT = async(payload) => {
  const getData = await axios({
    method: 'PUT',
    url: process.env.FINER_WORKS_URL+'/update_file_selection',
    headers: getHeaders(),
    data: payload
  });
  return getData.data;
};

/** For print one */
exports.LIST_FILE_SELECTION = async(guids) => {
  const getData = await axios({
    method: 'GET',
    url: process.env.FINER_WORKS_URL+'/list_file_selection?guid='+guids,
    headers: getHeaders()
  });
  return getData.data;
};

/** get Artzio details */
exports.ARTZIP_INTEGRATIONS = async(account_key) => {
  const getData = await axios({
    method: 'GET',
    url: process.env.FINER_WORKS_URL+'/test_my_credentials?account_key='+account_key,
    headers: getHeaders()
  });
  return getData.data;
};

/** To add the events */
exports.LOG_EVENT = async(payload) => {
  const getData = await axios({
    method: 'post',
    url:process.env.FINER_WORKS_URL+'/add_event',
    headers: getHeaders(),
    data: payload
  });
  return getData.data;
};
