// Run this with "mocha filequeue.test.js"

var assert = require('assert');
var rewire = require('rewire');

var FileQueue = rewire('../lib/filequeue');

// change the fs dependency to one that we control
/// This is our "dummy" filesystem:
var files = {
	'my_path' : 'some data',
	'my_other_path' : 'some_other_data'
};

var filesystem = {
	files: {
		'my_path': {
			data: new Buffer("some_data", 'utf8'),
			mode: '0777'
		},
		'my_other_path': {
			data: new Buffer("some_other_data", 'utf8'),
			mode: '0777'
		},
		'my_dir': {
			files: {
				'my_third_path': {
					data: new Buffer("even_more_data", 'utf8'),
					mode: '0777'
				}
			},
			mode: '0777'
		},
		'file-to-rename': {
			data: new Buffer('I will be renamed.', 'utf8'),
			mode: '0777'
		},
		'file-to-point-at': {
			data: new Buffer('something will link to me.', 'utf8'),
			mode: '0777'
		},
		'another-file-to-point-at': {
			data: new Buffer('something else will link to me', 'utf8'),
			mode: '0777'
		}
	},
	mode: '0777'
};

// set up special dot directories
filesystem.files['.'] = filesystem;
filesystem.files.my_dir.files['.'] = filesystem.files.my_dir;
filesystem.files.my_dir.files['..'] = filesystem;

// find the object referred to in our dummy filesystem
function fsPath(path) {
	var parts = path.split('/');

	var fs_path = filesystem;

	for(var i=0; i<parts.length; i++) {

		// undefined parts of the path just cause us to continue (e.g. /path//path2/ == /path/path2/)
		if(!parts[i]) {
			continue;
		}

		if(!fs_path || fs_path && !fs_path.files) {
			return fileErr('does_not_exist', 'open', path);
		}

		fs_path = fs_path.files[parts[i]];
	}

	return fs_path;
}

// get the parent directory for a file in a path
function parentDir(path) {
	return fsPath(path.substring(0, path.lastIndexOf('/')));
}

// get only the filename for a file in a path
function getFilename(path) {
	return path.substring(path.lastIndexOf('/') + 1);
}

// test if a file object is a directory
function isDirectory(obj) {
	return !!obj && !!obj.files && typeof obj.files === 'object';
}

function fileErr(errName, op, path) {
	var error;

	switch(errName) {
		case 'does_not_exist':

			error = new Error("Error: ENOENT, "+op+" '"+path+"'");
			error.code = 'ENOENT';
			error.path = path;
			error.errno = 34;

		break;

		case 'is_dir':

			error = new Error("Error: EISDIR, "+op);
			error.code = 'EISDIR';
			error.errno = 28;
		break;

		case 'not_dir':

			error = new Error("Error: ENOTDIR, "+op+" '"+path+"'");
			error.code = 'ENOTDIR';
			error.errno = 27;
			error.path = path;
		break;

		case 'exists':

			error = new Error("Error: EEXIST, "+op+" '"+path+"'");
			error.code = 'EEXIST';
			error.errno = 47;
			error.path = path;
		break;
	}

	return error;
}

function delayCallback(cb) {
	return function() {
		var _this = this;
		var args = [].slice.call(arguments);
		process.nextTick(function() {
			cb.apply(_this, args);
		});
	};
}

// The following is the "dummy" implementation of "fs", so our tests can be true
//  "unit" tests
FileQueue.__set__('fs', {
	readFile: function(filename, encoding, callback) {
		if(typeof encoding === 'function') {
			callback = encoding;
			encoding = null;
		}

		if(!callback) {
			callback = function(){};
		}

		callback = delayCallback(callback);

		var file = fsPath(filename);

		if(!file) {
			callback(fileErr('does_not_exist', 'read', filename));
			return;
		}

		if(file instanceof Error) {
			callback(file);
			return;
		}

		// this might be a directory
		if(!(file.data instanceof Buffer)) {
			callback(fileErr('is_dir', 'read'));
			return;
		}

		// if encoding is defined, convert buffer to string
		if(encoding) {
			callback(null, file.data.toString(encoding));
			return;
		}

		// return the raw buffer
		callback(null, file.data);
	},

	writeFile: function(filename, data, encoding, callback) {
		if(typeof encoding === 'function') {
			callback = encoding;
			encoding = 'utf8';
		}

		if(!callback) {
			callback = function() {};
		}

		callback = delayCallback(callback);

		var file = fsPath(filename);

		// valid directory, but no file defined
		if(!file) {
			var dir = parentDir(filename);
			file = dir.files[getFilename(filename)] = {
				mode: '0777'
			};
		}

		if(file instanceof Error) {
			callback(file);
			return;
		}

		if(data instanceof Buffer) {
			file.data = data;
		} else {
			file.data = new Buffer(data, encoding);
		}

		callback();
	},

	stat: function(path, callback) {

		callback = callback || function() {};
		callback = delayCallback(callback);

		var file = fsPath(path);

		if(file instanceof Error) {
			callback(file);
		}

		if(!file) {
			callback(fileErr('does_not_exist', 'stat', path));
		}

		// call back with a miniature version of fs.Stats
		callback(null, {
			isFile: function() {
				return file.data instanceof Buffer;
			},
			isDirectory: function() {
				return isDirectory(file);
			}
		});
	},

	readdir: function(path, callback) {
		callback = callback || function() {};
		callback = delayCallback(callback);

		var dir = fsPath(path);

		if(dir instanceof Error) {
			callback(dir);
			return;
		}

		if(!dir) {
			callback(fileErr('does_not_exist', 'readdir', path));
			return;
		}

		if(!isDirectory(dir)) {
			callback(fileErr('not_dir', 'readdir', path));
			return;
		}

		callback(null, Object.keys(dir.files));
	},

	rename: function(oldPath, newPath, callback) {
		callback = callback || function() {};
		callback = delayCallback(callback);

		var oldFile = fsPath(oldPath);

		if(oldFile instanceof Error) {
			callback(oldFile);
			return;
		}

		if(!oldFile) {
			callback(fileErr('does_not_exist', 'rename', oldPath));
			return;
		}

		var newDir = parentDir(newPath);

		if(newDir instanceof Error) {
			callback(newDir);
			return;
		}

		if(!newDir) {
			callback(fileErr('does_not_exist', 'rename', oldPath));
			return;
		}

		if(!isDirectory(newDir)) {
			callback(fileErr('not_dir', 'rename', oldPath));
			return;
		}

		// set it in the new location
		newDir.files[getFilename(newPath)] = oldFile;

		// remove the old location
		delete parentDir(oldPath).files[getFilename(oldPath)];

		callback();
	},

	symlink: function(srcPath, dstPath, type, callback) {
		if (arguments.length < 4) {
			callback = type;
			type = 'file';   // type is optional, defaults to 'file'
		}

		callback = callback || function() {};
		callback = delayCallback(callback);

		var srcFile = fsPath(srcPath);

		if(srcFile instanceof Error) {
			callback(srcFile);
			return;
		}

		if(!srcFile) {
			callback(fileErr('does_not_exist', 'symlink', srcPath));
			return;
		}

		var dstDir = parentDir(dstPath);

		if(dstDir instanceof Error) {
			callback(dstDir);
			return;
		}

		if(!dstDir) {
			callback(fileErr('does_not_exist', 'symlink', srcPath));
			return;
		}

		if(!isDirectory(dstDir)) {
			callback(fileErr('not_dir', 'symlink', srcPath));
			return;
		}

		if(!!dstDir.files[getFilename(dstPath)]) {
			callback(fileErr('exists', 'symlink', srcPath));
			return;
		}


		dstDir.files[getFilename(dstPath)] = {
			type: 'symlink',
			source: srcPath,
			files: srcFile.files,
			data: srcFile.data,
			windows_type: type
		};

		callback();
	},

	exists: function(path, callback) {
		callback = callback || function() {};
		callback = delayCallback(callback);

		var file = fsPath(path);

		if(file instanceof Error) {
			callback(false);
			return;
		}

		if(!file) {
			callback(false);
			return;
		}

		callback(true);
	},

	mkdir: function(path, mode, callback) {
		if(!callback) {
			callback = mode;
			mode = '0777';
		}

		callback = callback || function() {};
		callback = delayCallback(callback);

		var dir = parentDir(path);

		if(dir instanceof Error) {
			callback(dir);
			return;
		}

		if(!dir) {
			callback(fileErr('does_not_exist', 'mkdir', path));
			return;
		}

		if(!isDirectory(dir)) {
			callback(fileErr('not_dir', 'mkdir', path));
			return;
		}

		if(!!dir.files[getFilename(path)]) {
			callback(fileErr('exists', 'mkdir', path));
			return;
		}

		var newDir = dir.files[getFilename(path)] = {
			mode: mode,
			files: {}
		};

		newDir.files['.'] = newDir;
		newDir.files['..'] = dir;

		callback();
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
			assert.equal(data, filesystem.files['my_path'].data);
			done();
		});
	});

	it('should read many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			fq.readFile('my_other_path', function(err, data) {
				assert.equal(data, filesystem.files['my_other_path'].data);

				if(++count >= 1000) {
					done();
				}
			});
		}
	});
});

describe('rename', function () {
	var fq = new FileQueue();

	it('should rename a file', function(done) {

		// retrieve the contents of the original file
		fq.readFile('file-to-rename', 'utf8', function(err, contents) {

			assert.ifError(err);

			fq.rename('file-to-rename', 'this_is_a_different_file', function(err) {

				assert.ifError(err);

				fq.readFile('this_is_a_different_file', 'utf8', function(err, renamed_contents) {

					assert.ifError(err);

					assert.equal(contents, renamed_contents);

					done();
				});
			});
		});
	});

});

describe('symlink', function () {
	var fq = new FileQueue();

	it('should create symlink without optional "type" argument', function(done) {

		// grab the contents of the source file
		fq.readFile('file-to-point-at', 'utf8', function(err, contents) {

			assert.ifError(err);

			fq.symlink('file-to-point-at', 'symlink1', function(err) {

				assert.ifError(err);

				// check that file is symlink (should do this with fq.lstat once implemented)
				assert.equal(filesystem.files['symlink1'].type, 'symlink');

				// check that the contents are identical
				fq.readFile('symlink1', 'utf8', function(err, symlinked_contents) {

					assert.ifError(err);

					assert.equal(contents, symlinked_contents);

					// check that we can't create another symlink with the same name
					fq.symlink('another-file-to-point-at', 'symlink1', function(err) {

						assert.notEqual(err, null, 'expected error: path already exists');

						done();
					});
				});
			});
		});
	});

	it('should create symlink with optional "type" argument', function(done) {

		// grab the contents of the source file
		fq.readFile('file-to-point-at', 'utf8', function(err, contents) {

			assert.ifError(err);

			fq.symlink('file-to-point-at', 'symlink2', 'file', function(err) {

				assert.ifError(err);

				// check that file is symlink, (should do this with fq.lstat once implemented)
				assert.equal(filesystem.files['symlink2'].type, 'symlink');

				// check that the contents are identical
				fq.readFile('symlink2', 'utf8', function(err, symlinked_contents) {

					assert.ifError(err);

					assert.equal(contents, symlinked_contents);

					// check that the type of symlink is correct
					assert.equal(filesystem.files['symlink2'].windows_type, 'file');

					done();
				});
			});
		});
	});
});

describe('writeFile', function() {

	var fq = new FileQueue();

	it('should write file contents', function(done) {

		fq.writeFile('my_path', 'some different data', 'utf8', function(err) {

			assert.ifError(err);

			fq.readFile('my_path', 'utf8', function(err, data) {

				assert.equal(data, 'some different data');
				done();
			});
		});
	});

	it('should read many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			(function(num) {

				fq.writeFile('my_path_'+num, 'some different data '+num, 'utf8', function(err) {

					assert.ifError(err);

					fq.readFile('my_path_'+num, 'utf8', function(err, data) {

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

			assert.equal(stats.isFile(), fsPath('my_path').data instanceof Buffer);
			assert.equal(stats.isDirectory(), isDirectory(fsPath('my_path')));

			done();
		});
	});

});

describe('readdir', function() {

	var fq = new FileQueue();

	it('should return all filenames', function(done) {

		fq.readdir('.', function(err, _files) {

			assert.ifError(err);

			assert.equal(Object.keys(filesystem.files).length, _files.length);

			done();
		});
	});

});

describe('exists', function() {

	var fq = new FileQueue();

	it('should check if a file exists', function(done) {

		fq.exists('my_path', function(exists) {

			assert.equal(exists, !!fsPath('my_path'));

			done();
		});
	});

	it('should confirm that a file does not exist', function(done) {

		fq.exists('this_file_doesnt_exist', function(exists) {

			assert.equal(exists, !!fsPath('this_file_doesnt_exist'));

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

			assert.equal(isDirectory(filesystem.files[dirname]), true);
			assert.equal(filesystem.files[dirname].mode, '0777');

			done();
		});
	});

	it('should create a new directory with a custom mode', function(done) {
		var dirname = 'otherpath';
		var mode = '0666';
		fq.mkdir(dirname, mode, function(err) {
			assert.ifError(err);

			assert.equal(isDirectory(filesystem.files[dirname]), true);
			assert.equal(filesystem.files[dirname].mode, mode);

			done();
		});
	});

});

