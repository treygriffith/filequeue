var assert = require('assert');
var rewire = require('rewire');

var FileQueue = rewire('../lib/filequeue');

// change the fs dependency to one that we control
var files = {
	'my_path' : 'some data',
	'my_other_path' : 'some_other_data'
};

FileQueue.__set__('fs', {
	readFile: function(filename, encoding, callback) {
		if(typeof encoding === 'function') {
			callback = encoding;
			encoding = null;
		}
		if(callback) {
			process.nextTick(function() {
				callback(null, files[filename]);
			});
		}
	},

	writeFile: function(filename, data, encoding, callback) {
		if(typeof encoding === 'function') {
			callback = encoding;
			encoding = null;
		}

		files[filename] = data;

		if(callback) {
			process.nextTick(function() {
				callback(null);
			});
		}
	},

	stat: function(path, callback) {
		var isFile = !!files[path];

		if(callback) {
			// call back with a miniature version of fs.Stats
			process.nextTick(function() {
				callback(null, {
					isFile: function() {
						return isFile;
					},
					isDirectory: function() {
						return !isFile;
					}
				});
			});
		}
	},

	readdir: function(path, callback) {
		var keys = Object.keys(files);

		if(callback) {
			process.nextTick(function() {
				callback(null, keys);
			});
		}
	},

	exists: function(path, callback) {
		var exists = !!files[path];

		if(callback) {
			process.nextTick(function() {
				callback(null, exists);
			});
		}
	},

	mkdir: function(path, mode, callback) {
		if(!callback) {
			callback = mode;
			mode = '0777';
		}
		files[path] = {
			mode: mode
		};
		callback(null);
	}
});


describe('FileQueue', function() {

	var fq = new FileQueue();

	it('should return a reference to the same instance', function() {
		var fq2 = new FileQueue();
		assert.deepEqual(fq, fq2);
	});

	it('should change the limit for the existing instance', function() {
		var fq2 = new FileQueue(2000);
		assert.equal(fq.limit, 2000);
	});

	it('should return a new instance when flagged', function() {
		var fq3 = new FileQueue(true);
		assert.notDeepEqual(fq, fq3);
	});

});

describe('readFile', function() {

	var fq = new FileQueue(200);

	it('should read file contents', function(done) {
		fq.readFile('my_path', function(err, data) {
			assert.equal(data, files['my_path']);
			done();
		});
	});

	it('should read many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			fq.readFile('my_other_path', function(err, data) {
				assert.equal(data, files['my_other_path']);

				if(++count >= 1000) {
					done();
				}
			});
		}
	});
});

describe('writeFile', function() {

	var fq = new FileQueue();

	it('should write file contents', function(done) {
		fq.writeFile('my_path', 'some different data', function(err) {
			assert.ifError(err);

			fq.readFile('my_path', function(err, data) {
				assert.equal(data, 'some different data');
				done();
			});
		});
	});

	it('should read many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			(function(num) {
				fq.writeFile('my_path_'+num, 'some different data '+num, function(err) {
					assert.ifError(err);

					fq.readFile('my_path_'+num, function(err, data) {
						assert.equal(data, 'some different data '+num);

						if(++count >= 1000) {
							done();
						}
					});
				});
			})(i);
		}
	});

});

describe('stat', function() {

	var fq = new FileQueue();

	it('should return a stats object', function(done) {
		fq.stat('my_path', function(err, stats) {
			assert.ifError(err);

			assert.equal(stats.isFile(), !!files['my_path']);

			done();
		});
	});

});

describe('readdir', function() {

	var fq = new FileQueue();

	it('should return all filenames', function(done) {
		fq.readdir('irrelevant', function(err, _files) {
			assert.ifError(err);

			assert.equal(Object.keys(files).length, _files.length);

			done();
		});
	});

});

describe('exists', function() {

	var fq = new FileQueue();

	it('should check if a file exists', function(done) {
		fq.exists('my_path', function(err, exists) {
			assert.ifError(err);

			assert.equal(exists, !!files['my_path']);

			done();
		});
	});

});

describe('mkdir', function() {

	var fq = new FileQueue();

	it('should create a new directory with the default mode', function(done) {
		var dirname = 'newdir';
		fq.mkdir(dirname, function(err) {
			assert.ifError(err);

			assert.equal(typeof files[dirname], 'object');
			assert.equal(files[dirname].mode, '0777');

			done();
		});
	});

	it('should create a new directory with a custom mode', function(done) {
		var dirname = 'otherpath';
		var mode = '0666';
		fq.mkdir(dirname, mode, function(err) {
			assert.ifError(err);

			assert.equal(typeof files[dirname], 'object');
			assert.equal(files[dirname].mode, mode);

			done();
		});
	});

});

