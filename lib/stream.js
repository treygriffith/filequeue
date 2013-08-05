var fs = require('fs');
var util = require('util');

util.inherits(FQReadStream, fs.ReadStream);

function FQReadStream(path, options) {

	// temporarily change our #open method so the ReadStream initializer doesn't open the file
	var open = this.open;
	this.open = function() {};

	fs.ReadStream.call(this, path, options);

	this.open = open;

	return this;
}

module.exports = FQReadStream;