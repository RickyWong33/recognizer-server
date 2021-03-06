module.exports = {
	// Allowed log levels: error, info, debug
	logLevel: 'info',
	// If logFile is empty, then all logs will output to console
	logFile: '',
	port: 8003,
	// Client connection inactivity timeout in seconds
	connectionTimeout: 3,
	s3Report: {
		params: {
			Bucket: ''
		},
		accessKeyId: '',
		secretAccessKey: ''
	},
	s3Upload: {
		params: {
			Bucket: ''
		},
		accessKeyId: '',
		secretAccessKey: ''
	},
	statsD: {
		host: '',
		port: 8125
	},
	mysql: {
		host: '',
		user: '',
		password: '',
		database: ''
	}
};
