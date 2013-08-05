// Run this with "mocha filequeue.test.js"

var assert = require('assert');
var rewire = require('rewire');

var FileQueue = rewire('../lib/filequeue');

// Shim in our controlled version of fs
var fs = require('./fs-shim');
FileQueue.__set__('fs', fs);


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
			assert.equal(data, fs.__internal.filesystem.files['my_path'].data);
			done();
		});
	});

	it('should read many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			fq.readFile('my_other_path', function(err, data) {
				assert.equal(data, fs.__internal.filesystem.files['my_other_path'].data);

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
		fq.readFile('file-to-rename', {encoding: 'utf8'}, function(err, contents) {

			assert.ifError(err);

			fq.rename('file-to-rename', 'this_is_a_different_file', function(err) {

				assert.ifError(err);

				fq.readFile('this_is_a_different_file', {encoding: 'utf8'}, function(err, renamed_contents) {

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
		fq.readFile('file-to-point-at', {encoding: 'utf8'}, function(err, contents) {

			assert.ifError(err);

			fq.symlink('file-to-point-at', 'symlink1', function(err) {

				assert.ifError(err);

				// check that file is symlink (should do this with fq.lstat once implemented)
				assert.equal(fs.__internal.filesystem.files['symlink1'].type, 'symlink');

				// check that the contents are identical
				fq.readFile('symlink1', {encoding: 'utf8'}, function(err, symlinked_contents) {

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
		fq.readFile('file-to-point-at', {encoding: 'utf8'}, function(err, contents) {

			assert.ifError(err);

			fq.symlink('file-to-point-at', 'symlink2', 'file', function(err) {

				assert.ifError(err);

				// check that file is symlink, (should do this with fq.lstat once implemented)
				assert.equal(fs.__internal.filesystem.files['symlink2'].type, 'symlink');

				// check that the contents are identical
				fq.readFile('symlink2', 'utf8', function(err, symlinked_contents) {

					assert.ifError(err);

					assert.equal(contents, symlinked_contents);

					// check that the type of symlink is correct
					assert.equal(fs.__internal.filesystem.files['symlink2'].windows_type, 'file');

					done();
				});
			});
		});
	});
});

describe('writeFile', function() {

	var fq = new FileQueue();

	it('should write file contents', function(done) {

		fq.writeFile('my_path', 'some different data', {encoding: 'utf8'}, function(err) {

			assert.ifError(err);

			fq.readFile('my_path', {encoding: 'utf8'}, function(err, data) {

				assert.equal(data, 'some different data');
				done();
			});
		});
	});

	it('should write many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			(function(num) {

				fq.writeFile('my_path_'+num, 'some different data '+num, {encoding: 'utf8'}, function(err) {

					assert.ifError(err);

					fq.readFile('my_path_'+num, {encoding: 'utf8'}, function(err, data) {

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

			assert.equal(stats.isFile(), fs.__internal.fsPath('my_path').data instanceof Buffer);
			assert.equal(stats.isDirectory(), fs.__internal.isDirectory(fs.__internal.fsPath('my_path')));

			done();
		});
	});

});

describe('readdir', function() {

	var fq = new FileQueue();

	it('should return all filenames', function(done) {

		fq.readdir('.', function(err, _files) {

			assert.ifError(err);

			assert.equal(Object.keys(fs.__internal.filesystem.files).length, _files.length);

			done();
		});
	});

});

describe('exists', function() {

	var fq = new FileQueue();

	it('should check if a file exists', function(done) {

		fq.exists('my_path', function(exists) {

			assert.equal(exists, !!fs.__internal.fsPath('my_path'));

			done();
		});
	});

	it('should confirm that a file does not exist', function(done) {

		fq.exists('this_file_doesnt_exist', function(exists) {

			assert.equal(exists, !!fs.__internal.fsPath('this_file_doesnt_exist'));

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

			assert.equal(fs.__internal.isDirectory(fs.__internal.filesystem.files[dirname]), true);
			assert.equal(fs.__internal.filesystem.files[dirname].mode, '0777');

			done();
		});
	});

	it('should create a new directory with a custom mode', function(done) {
		var dirname = 'otherpath';
		var mode = '0666';
		fq.mkdir(dirname, mode, function(err) {
			assert.ifError(err);

			assert.equal(fs.__internal.isDirectory(fs.__internal.filesystem.files[dirname]), true);
			assert.equal(fs.__internal.filesystem.files[dirname].mode, mode);

			done();
		});
	});

});

