// Use a dummy shim for FS to make the tests true unit tests

/// This is our "dummy" filesystem:
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

exports.readFile = function(filename, options, callback) {
	if(!callback) {
		callback = options;
		options = null;
	}

	var encoding = options && options.encoding;

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
};

exports.writeFile = function(filename, data, options, callback) {

	if(!callback) {
		callback = options;
		options = null;
	}

	var encoding = (options && options.encoding) || 'utf8';

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
};

exports.stat = function(path, callback) {

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
};

exports.readdir = function(path, callback) {
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
};

exports.rename = function(oldPath, newPath, callback) {
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
};

exports.symlink = function(srcPath, dstPath, type, callback) {
	if (arguments.length < 4) {
		callback = type;
		type = 'file';   // type is optional, defaults to 'file'
	}

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
};

exports.exists = function(path, callback) {
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
};

exports.mkdir = function(path, mode, callback) {
	if(!callback) {
		callback = mode;
		mode = '0777';
	}

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
};

// expose the internal filesystem and util functions for testing
exports.__internal = {
	filesystem: filesystem,
	isDirectory: isDirectory,
	fsPath: fsPath
};