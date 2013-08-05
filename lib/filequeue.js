// FileQueue#readFile is a drop-in replacement for fs.readFile that prevents too many files from being opened at once.
var fs = require('fs');
var addFsMethods = require('./methods');

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

		// get the method name from the queue
		var method = args.shift();

		// do the acual fs method
		fs[method].apply(fs, args);
	} else {
		// we can't execute it yet, so we put it back in the front of the line
		fq.queue.unshift(args);
	}
};

addFsMethods(FileQueue);