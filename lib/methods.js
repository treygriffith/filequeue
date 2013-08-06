// All of the fs methods we want exposed on fq
// This should pass the Grep Test (http://jamie-wong.com/2013/07/12/grep-test/)

var stream = require('./stream');

module.exports = function (FQ) {

	/**
	 * Asynchronously reads the entire contents of a file
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_readfile_filename_options_callback           
	 */
	FQ.prototype.readFile = function(filename, options, callback) {

		if(!callback) {
			callback = options;
			options = null;
		}

		this.addToQueue(function(fs, cb) {

			if(options) {
				fs.readFile(filename, options, cb);
				return;
			}

			fs.readFile(filename, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * Asynchronous rename
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_rename_oldpath_newpath_callback
	 */
	FQ.prototype.rename = function(oldPath, newPath, callback) {

		this.addToQueue(function(fs, cb) {

			fs.rename(oldPath, newPath, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * Asynchronous symlink
	 * http://nodejs.org/docs/latest/api/fs.html#fs_fs_symlink_srcpath_dstpath_type_callback
	 */
	FQ.prototype.symlink = function(srcpath, dstpath, type, callback) {

		if(!callback) {
			callback = type;
			type = null;
		}

		this.addToQueue(function(fs, cb) {

			if(type) {
				fs.symlink(srcpath, dstpath, type, cb);
				return;
			}

			fs.symlink(srcpath, dstpath, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * Asynchronously write data to file
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_writefile_filename_data_options_callback
	 */
	FQ.prototype.writeFile = function(filename, data, options, callback) {

		if(!callback) {
			callback = options;
			options = null;
		}

		this.addToQueue(function(fs, cb) {

			if(options) {
				fs.writeFile(filename, data, options, cb);
				return;
			}

			fs.writeFile(filename, data, cb);

 		}, callback);

		this.execQueue();
	};

	/**
	 * Asynchronous stat
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_stat_path_callback
	 */
	FQ.prototype.stat = function(path, callback) {

		this.addToQueue(function(fs, cb) {

			fs.stat(path, cb);

		}, callback)

		this.execQueue();
	};

	/**
	 * Asynchronous readdir
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_readdir_path_callback
	 */
	FQ.prototype.readdir = function(path, callback) {

		this.addToQueue(function(fs, cb) {

			fs.readdir(path, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * Test whether or not the given path exists by checking with the file system.
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_exists_path_callback
	 */
	FQ.prototype.exists = function(path, callback) {

		this.addToQueue(function(fs, cb) {

			fs.exists(path, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * Asynchronous mkdir
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_mkdir_path_mode_callback
	 */
	FQ.prototype.mkdir = function(path, mode, callback) {

		if(!callback) {
			callback = mode;
			mode = null;
		}

		this.addToQueue(function(fs, cb) {

			if(mode) {
				fs.mkdir(path, mode, cb);
				return;
			}

			fs.mkdir(path, cb);

		}, callback);

		this.execQueue();
	};

	/**
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_class_fs_readstream
	 */
	FQ.prototype.ReadStream = stream.ReadStream;

	/**
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_createreadstream_path_options
	 */
	FQ.prototype.createReadStream = function(path, options) {

		var readStream = new this.ReadStream(path, options);

		this.addToQueue(function(fs, cb) {

			readStream.on('close', cb);

			readStream.open();
		});

		this.execQueue();

		return readStream;
	};

	/**
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_class_fs_writestream
	 */
	FQ.prototype.WriteStream = stream.WriteStream;

	/**
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_createwritestream_path_options
	 */
	FQ.prototype.createWriteStream = function(path, options) {

		var writeStream = new this.WriteStream(path, options);

		this.addToQueue(function(fs, cb) {

			writeStream.on('close', cb);

			writeStream.open();
		});

		this.execQueue();

		return writeStream;
	};

};