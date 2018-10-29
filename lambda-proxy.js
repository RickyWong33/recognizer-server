const AWS = require('aws-sdk');
const Lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

exports.handler = async function (event) {
	
	let params = {
		FunctionName: process.env.FUNCTION_MAIN,
		InvocationType: 'RequestResponse',
		Payload: JSON.stringify(event)
	};
	
	let result = await Lambda.invoke(params).promise();
	
	if (result.FunctionError) {
		throw new Error('Lambda error: ' + result.Payload);
	}
	
	return JSON.parse(result.Payload);
};
