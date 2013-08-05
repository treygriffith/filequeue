var fs = require('fs');
var util = require('util');

util.inherits(FQReadStream, fs.ReadStream);

function FQReadStream(path, options) {
	options = options || {};

	// if we pass a file descriptor, the ReadStream initializer won't automatically try to open the file
	options.fd = options.fd || 100000000000000; // insanely large file descriptor so if the read starts accidentally, it will throw an error;

	fs.ReadStream.call(this, path, options);

	return this;
}

module.exports = FQReadStream;