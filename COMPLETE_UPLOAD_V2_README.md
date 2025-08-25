<!-- # Complete Upload V2 with SVG to PNG Conversion

## Overview

The `/complete-upload-v2` route provides enhanced file upload functionality that automatically converts SVG files to PNG format and stores both versions in the S3 bucket. This route is designed for vector image workflows where both the original SVG and a raster PNG version are needed.

## Route Details

- **Endpoint**: `POST /complete-upload-v2`
- **Purpose**: Complete multipart upload of SVG files with automatic PNG conversion
- **Dependencies**: Sharp library for SVG to PNG conversion

## Request Parameters

```json
{
  "params": {
    "uploadId": "string",
    "fileName": "string.svg",
    "folderPath": "string",
    "parts": [
      {
        "ETag": "string",
        "PartNumber": "number"
      }
    ],
    "userInfo": {
      "libraryName": "string",
      "librarySessionId": "string",
      "libraryAccountKey": "string",
      "librarySiteId": "string"
    }
  }
}
```

### Parameter Descriptions

- **uploadId**: The multipart upload ID from S3
- **fileName**: The name of the SVG file being uploaded
- **folderPath**: The folder path where files should be stored
- **parts**: Array of multipart upload parts with ETags and part numbers
- **userInfo**: User authentication and library information

## Workflow

### 1. SVG Upload Completion
- Completes the multipart upload for the SVG file
- Stores the SVG file in the specified S3 bucket and folder

### 2. SVG to PNG Conversion
- Downloads the uploaded SVG file from S3
- Uses the Sharp library to convert SVG to PNG format
- Maintains the same filename with `.png` extension

### 3. PNG Upload
- Uploads the converted PNG file to the same S3 folder
- Uses the same naming convention (different extension only)

### 4. Fineworks API Update
- Updates the Fineworks API with both file records
- Creates separate entries for SVG and PNG versions
- Both files are linked to the same library and account

## Response Format

### Success Response (200)
```json
{
  "statusCode": 200,
  "status": true,
  "message": "SVG upload completed with PNG conversion",
  "svgFile": "path/to/svg/file.svg",
  "pngFile": "path/to/png/file.png",
  "guid": "fineworks-guid"
}
```

### Error Response (500)
```json
{
  "status": false,
  "message": "Error description"
}
```

## File Storage Structure

Both files are stored in the same S3 folder with identical names but different extensions:

```
s3://bucket-name/
└── folder-path/
    ├── file-name.svg    (Original SVG file)
    └── file-name.png    (Converted PNG file)
```

## Technical Implementation

### Dependencies
- **Sharp**: High-performance image processing library for SVG to PNG conversion
- **AWS SDK**: For S3 operations (getObject, putObject, headObject)
- **Express**: For route handling

### Key Functions

1. **completeUploadV2WithConversion**: Main route handler
2. **convertSvgToPngAndUpload**: Handles SVG to PNG conversion and PNG upload
3. **updateFineworksAPIWithBothFiles**: Updates Fineworks API with both file records

### Error Handling
- Comprehensive error logging using debug module
- Graceful error responses with meaningful messages
- Rollback handling for failed operations

## Usage Example

```javascript
const axios = require('axios');

const uploadData = {
  params: {
    uploadId: "multipart-upload-id",
    fileName: "design.svg",
    folderPath: "projects/2024/designs",
    parts: [
      { ETag: "etag1", PartNumber: 1 },
      { ETag: "etag2", PartNumber: 2 }
    ],
    userInfo: {
      libraryName: "design-library",
      librarySessionId: "session-123",
      libraryAccountKey: "account-key",
      librarySiteId: "site-456"
    }
  }
};

try {
  const response = await axios.post('/complete-upload-v2', uploadData);
  console.log('Upload successful:', response.data);
} catch (error) {
  console.error('Upload failed:', error.response.data);
}
```

## Benefits

1. **Automatic Conversion**: No manual intervention required for PNG generation
2. **Dual Format Support**: Both vector and raster versions available
3. **Consistent Naming**: Files maintain relationship through naming convention
4. **API Integration**: Seamless integration with existing Fineworks API
5. **Error Handling**: Robust error handling and logging

## Considerations

- **File Size**: PNG files may be larger than SVG files
- **Processing Time**: Conversion adds additional processing time
- **Storage Cost**: Two files stored instead of one
- **Format Limitations**: Only SVG files are supported for conversion

## Troubleshooting

### Common Issues

1. **Sharp Library Not Found**: Ensure `npm install sharp` has been run
2. **S3 Permissions**: Verify S3 read/write permissions for the bucket
3. **Memory Issues**: Large SVG files may require increased memory allocation
4. **Conversion Failures**: Check SVG file validity and format compliance

### Debug Information

Enable debug logging by setting the `DEBUG` environment variable:
```bash
export DEBUG=app:UploadImage
```

## Future Enhancements

- Support for additional output formats (JPEG, WebP)
- Configurable PNG quality and dimensions
- Batch processing for multiple files
- Progress tracking for large conversions -->
