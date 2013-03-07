// FileQueue#readFile is a drop-in replacement for fs.readFile that prevents too many files from being opened at once.
var fs = require('fs');

var fq;

// Instantiate a new FileQueue. Pass in the maximum number of files to be opened at any one time.
// By default it attempts to return an already instantiated instance of FileQueue so that your maxfiles is shared across processes
// However, by setting the `newQueue` to true you can request an entirely new queue (and one that won't be returned to any other instantiators)
function FileQueue(limit, newQueue) {
	if(typeof limit === 'boolean') {
		newQueue = limit;
		limit = null;
	}

	if(!limit) {
		limit = 200; // default file queue limit of 200, based on normal maxfiles of 256
	}

	// if there is already an instance of FileQueue running, update the limit and return it
	if(fq instanceof FileQueue && !newQueue) {
		if(limit > fq.limit) {
			fq.limit = limit;
		}
		return fq;
	}

	this.limit = limit;
	this.queue = [];
	this.openFiles = 0;

	// create a reference to the instance to be accessed again
	if(!newQueue) {
		fq = this;
	}

	return this;
}

// Export the constructor function
module.exports = FileQueue;


// Internally used to add an fs command to the queue
FileQueue.prototype.addToQueue = function() {
	var fq = this;

	var args = Array.prototype.slice.call(arguments);

	// retrieve the original callback
	var callback = args.pop();

	// add our own callback that adjust the open files and moves the queue
	args.push(function() {

		// remove this as an open file
		fq.openFiles--;

		// execute the queue if there are files sitting in it
		fq.execQueue();

		// call the original callback
		callback.apply(this, Array.prototype.slice.call(arguments));
	});

	// add it to the queue
	fq.queue.push(args);

	return fq.queue;
};

// Internally used to execute the next command in the queue
FileQueue.prototype.execQueue = function() {
	var fq = this;

	// only execute if the queue has any files
	if(!fq.queue.length) {
		return;
	}

	// execute the first file in the queue
	var args = fq.queue.shift();

	// check that we're not over our limit
	if(fq.openFiles < fq.limit) {

		// account for this file being open
		fq.openFiles++;

		// get the operation name from the queue
		var operation = args.shift();

		// do the acual operation
		fs[operation].apply(fs, args);
	} else {
		// we can't execute it yet, so we put it back in the front of the line
		fq.queue.unshift(args);
	}
};


// mimics to fs.readFile
FileQueue.prototype.readFile = function(filename, encoding, callback) {
	var fq = this;

	var args = ['readFile', filename];

	// normalize the arguments: both encoding and callback are optional
	if(typeof encoding === 'function') {
		callback = encoding;
		encoding = null;
	}
	if(!callback) {
		callback = function() {};
	}

	if(encoding) {
		args.push(encoding);
	}

	args.push(callback);

	// add it to the queue
	fq.addToQueue.apply(fq, args);

	// trigger queue execution
	fq.execQueue();
};

// mimics fs.writeFile
FileQueue.prototype.writeFile = function(filename, data, encoding, callback) {
	var fq = this;

	var args = ['writeFile', filename, data];

	// normalize the arguments: both encoding and callback are optional
	if(typeof encoding === 'function') {
		callback = encoding;
		encoding = null;
	}
	if(!callback) {
		callback = function() {};
	}

	if(encoding) {
		args.push(encoding);
	}

	args.push(callback);

	// add it to the queue
	fq.addToQueue.apply(fq, args);

	// trigger queue execution
	fq.execQueue();
};

// mimics fs.stat
FileQueue.prototype.stat = function(path, callback) {
	var fq = this;

	if(!callback) {
		callback = function(){};
	}

	fq.addToQueue('stat', path, callback);

	fq.execQueue();
};

FileQueue.prototype.readdir = function(path, callback) {
	var fq = this;

	if(!callback) {
		callback = function(){};
	}

	fq.addToQueue('readdir', path, callback);

	fq.execQueue();
};

// mimics fs.exists
FileQueue.prototype.exists = function(path, callback) {
	var fq = this;

	if(!callback) {
		callback = function(){};
	}

	fq.addToQueue('exists', path, callback);

	fq.execQueue();
};