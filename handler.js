'use strict';

// Node 6.10 that is used by AWS Lambda doesn't support await/async

const AWS = require('aws-sdk');
const NAMES_TABLE = process.env.NAMES_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const rekognition = new AWS.Rekognition();

let faceDetails,
  labelData;

module.exports.addWord = (event, context, callback) => {
  let response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  const {word, meaning} = JSON.parse(event.body);
  console.log(`Request to save word ${word}:${meaning}`);

  const params = {
    TableName: NAMES_TABLE,
    Item: {
      word,
      meaning
    }
  }

  dynamoDb.put(params).promise().then(() => {
    response.body = JSON.stringify(params.Item);
    callback(null, response);
  }).catch(err => {
    console.log(err.message);
    response.statusCode = 400;
    response.body = JSON.stringify({error: 'Could not save word'})
    callback(null, response);
  });
}

module.exports.getWord = (event, context, callback) => {
  let response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  const word = event.queryStringParameters.word;
  console.log(`Request to retrieve word ${word}`);

  const params = {
    TableName: NAMES_TABLE,
    Key: {
      word
    }
  }

  dynamoDb.get(params).promise().then(result => {
    if (result.Item) {
      const {word, meaning} = result.Item;
      response.body = JSON.stringify({word, meaning})
      callback(null, response);
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({error: 'Word does not exist'})
      callback(null, response);
    }
  }).catch(err => {
    console.log(err.message);
    response.statusCode = 400;
    response.body = JSON.stringify({error: 'Could not retrieve word'})
    callback(null, response);
  });
}

function addToFacesTable() {
  let labels = [];

  labelData.forEach((label) => {
    labels.push(label.Name);
  });

  let emotions = faceDetails[0]["Emotions"];
  let ageRange = faceDetails[0]["AgeRange"];
  let gender = faceDetails[0]["Gender"];

  console.log(emotions, ageRange, gender);

  /*
  let params = {
    TableName: config.dynamo.tableName,
    Item: {
      faceId: 1,
      filename: key.split(".")[0],
      timestamp: new Date().getTime(),
      emotionType1: emotions[0].Type,
      emotionConf1: emotions[0].Confidence,
      emotionType2: emotions[1].Type,
      emotionConf2: emotions[1].Confidence,
      ageLow: ageRange.Low,
      ageHigh: ageRange.High,
      genderValue: gender.Value,
      genderConf: gender.Confidence,
      labels: labels
    }
  };

  return dynamoDb.put(params).promise();
  */

  return new Promise((resolve, reject) => {
    resolve({});
  });
}

function analyseResponse(textDetections) {
  return new Promise((resolve, reject) => {
    resolve(textDetections
      .filter(detection => detection.Type == 'WORD' && detection.Confidence >= 85)
      .map(detection => detection.DetectedText));
  });
}

function recognizeText(bucket, key) {
  let params = {
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    }
  };

  return rekognition.detectText(params).promise();
}

function rekognizeFace(bucket, key) {
  let params = {
    Attributes: ["ALL"],
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    }
  };

  console.log(params);

  return rekognition.detectFaces(params).promise();
}

function rekognizeLabels(bucket, key) {
  let params = {
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    },
    MaxLabels: 3,
    MinConfidence: 80
  };

  console.log(params);
  console.log("----------------------");

  return rekognition.detectLabels(params).promise();
}

module.exports.addedImage = (event, context, callback) => {
  console.log('ENTERING ADDED IMAGE');
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  console.log(`Added image to S3 ${bucket}:${key}`);

  /*
  rekognizeLabels(bucket, key).then((data) => {
    labelData = data['Labels'];
    return rekognizeFace(bucket, key);
  }).then((faceData) => {
    console.log(faceData);
    faceDetails = faceData['FaceDetails'];
    return addToFacesTable();
  }).then((data) => {
    console.log('COMPLETED');
    callback(null, data);
  }).catch((err) => {
    console.log(err);
    callback(err, null);
  });
  */

  recognizeText(bucket, key).then((data) => {
    console.log(data);
    return analyseResponse(data['TextDetections']);
  }).then((result) => {
    console.log(result);
    callback(null, result);
  }).catch((err) => {
    console.log(err);
    callback(err, null);
  });

}
