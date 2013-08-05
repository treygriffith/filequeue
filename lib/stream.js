var fs = require('fs');
var util = require('util');

var fq = exports;

util.inherits(FQReadStream, fs.ReadStream);
fq.ReadStream = FQReadStream;

function FQReadStream(path, options) {

	// temporarily change our #open method so the ReadStream initializer doesn't open the file
	var open = this.open;
	this.open = function() {};

	fs.ReadStream.call(this, path, options);

	this.open = open;

	return this;
}

util.inherits(FQWriteStream, fs.WriteStream);
fq.WriteStream = FQWriteStream;

function FQWriteStream(path, options) {

	// temporarily change our #open method so the ReadStream initializer doesn't open the file
	var open = this.open;
	this.open = function() {};

	fs.WriteStream.call(this, path, options);

	this.open = open;

	return this;
}