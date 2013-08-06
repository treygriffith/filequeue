// FileQueue#readFile is a drop-in replacement for fs.readFile that prevents too many files from being opened at once.
var fs = require('fs');
var addFsMethods = require('./methods');

var fq;

// Export the constructor function
module.exports = FileQueue;

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

FileQueue.prototype.addToQueue = function(fn, callback) {

	this.queue.push({
		fn: fn,
		callback: callback
	});

	return this;
};

FileQueue.prototype.execQueue = function() {

	var fq = this;

	// only execute if the queue has any files
	if(!this.queue.length) {
		return;
	}

	// execute the first file in the queue
	var command = this.queue.shift();

	// check that we're not over our limit
	if(this.openFiles < this.limit) {

		// account for this file being open
		this.openFiles++;

		command.fn(fs, function() {

			fq.openFiles--;
			fq.execQueue();

			if(command.callback) {
				command.callback.apply(this, [].slice.call(arguments));
			}
		});
	} else {

		// we can't execute it yet, so we put it back in the front of the line
		this.queue.unshift(command);
	}
};

addFsMethods(FileQueue);
