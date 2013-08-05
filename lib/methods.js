// All of the fs methods we want exposed on fq
// This should pass the Grep Test (http://jamie-wong.com/2013/07/12/grep-test/)

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

		if(options) {
			this.addToQueue('readFile', filename, options, callback);
		} else {
			this.addToQueue('readFile', filename, callback);
		}

		this.execQueue();
	};

	/**
	 * Asynchronous rename
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_rename_oldpath_newpath_callback
	 */
	FQ.prototype.rename = function(oldPath, newPath, callback) {

		this.addToQueue('rename', oldPath, newPath, callback);

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

		if(type) {
			this.addToQueue('symlink', srcpath, dstpath, type, callback);
		} else {
			this.addToQueue('symlink', srcpath, dstpath, callback);
		}

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

		if(options) {
			this.addToQueue('writeFile', filename, data, options, callback);
		} else {
			this.addToQueue('writeFile', filename, data, callback);
		}

		this.execQueue();
	};

	/**
	 * Asynchronous stat
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_stat_path_callback
	 */
	FQ.prototype.stat = function(path, callback) {

		this.addToQueue('stat', path, callback);

		this.execQueue();
	};

	/**
	 * Asynchronous readdir
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_readdir_path_callback
	 */
	FQ.prototype.readdir = function(path, callback) {

		this.addToQueue('readdir', path, callback);

		this.execQueue();
	};

	/**
	 * Test whether or not the given path exists by checking with the file system.
	 * http://nodejs.org/docs/v0.10.15/api/fs.html#fs_fs_exists_path_callback
	 */
	FQ.prototype.exists = function(path, callback) {

		this.addToQueue('exists', path, callback);

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

		if(mode) {
			this.addToQueue('mkdir', mode, callback);
		} else {
			this.addToQueue('mkdir', callback);
		}

		this.execQueue();
	};

};