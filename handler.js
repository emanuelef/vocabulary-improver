'use strict';

// Node 6.10 that is used by AWS Lambda doesn't support await/async

const AWS = require('aws-sdk');
const NAMES_TABLE = process.env.NAMES_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
