// Run this with "mocha filequeue.test.js"

var assert = require('assert');
var temp = require('temp');
var fs = require('fs');
var path = require('path');

var FileQueue = rewire('../lib/filequeue');

var dir = temp.mkdirSync('filequeue-test');

function makePath(filename) {
	return path.join(dir, filename);
}

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

		var text = 'some random text';

		fs.writeFile(makePath('my_path'), text, function(err) {

			assert.ifError(err);

			fq.readFile(makePath('my_path'), {encoding: 'utf8'}, function(err, data) {

				assert.ifError(err);

				assert.equal(data, text);

				done();
			});
		});
	});

	it('should read many files without crashing', function(done) {

		var text = 'some other text';

		fs.writeFile(makePath('my_other_path'), text, function(err) {

			assert.ifError(err);

			var count = 0;
			for(var i=0;i<1000;i++) {
				fq.readFile('my_other_path', {encoding: 'utf8'}, function(err, data) {

					assert.ifError(err);

					assert.equal(data, text);

					if(++count >= 1000) {
						done();
					}
				});
			}
		});
	});
});

describe('rename', function () {
	var fq = new FileQueue();

	it('should rename a file', function(done) {

		var text = 'this file will be renamed';

		fs.writeFile(makePath('file-to-rename'), text, function(err) {

			assert.ifError(err);

			fq.rename(makePath('file-to-rename'), makePath('this_is_a_different_file'), function(err) {

				assert.ifError(err);

				fs.readFile(makePath('this_is_a_different_file'), {encoding: 'utf8'}, function(err, contents) {

					assert.ifError(err);

					assert.equal(contents, text);

					done();
				});
			});
		});
	});

});

describe('symlink', function () {
	var fq = new FileQueue();

	it('should create symlink without optional "type" argument', function(done) {

		var text = "this file will be symlinked";

		fs.writeFile(makePath('file-to-point-at'), text, function(err) {

			assert.ifError(err);

			fq.symlink(makePath('file-to-point-at'), makePath('symlink1'), function(err) {

				assert.ifError(err);

				fs.lstat(makePath('symlink1'), function(err, stats) {

					assert.ifError(err);

					// make sure we created a symlink
					assert.ok(stats.isSymbolicLink());

					// check that we can't create another symlink with the same name
					fq.symlink(makePath('file-to-point-at'), makePath('symlink1'), function(err) {

						assert.notEqual(err, null, 'expected error: path already exists');

						done();
					});
				});
			});
		});

	});

	it('should create symlink with optional "type" argument', function(done) {

		// only applicable on windows environments, which I don't have a box for
	});
});

describe('writeFile', function() {

	var fq = new FileQueue();

	it('should write file contents', function(done) {

		var text = 'some different data';

		fq.writeFile(makePath('my_path'), text, {encoding: 'utf8'}, function(err) {

			assert.ifError(err);

			fs.readFile(makePath('my_path'), {encoding: 'utf8'}, function(err, data) {

				assert.equal(data, text);
				done();
			});
		});
	});

	it('should write many files without crashing', function(done) {
		var count = 0;
		for(var i=0;i<1000;i++) {
			(function(num) {

				fq.writeFile(makePath('my_path_'+num), 'some different data '+num, {encoding: 'utf8'}, function(err) {

					assert.ifError(err);

					fq.readFile(makePath('my_path_'+num), {encoding: 'utf8'}, function(err, data) {

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

		fq.stat(makePath('my_path'), function(err, stats) {

			assert.ifError(err);

			fs.stat(makePath('my_path'), function(err, realStats) {

				assert.ifError(err);

				assert.equal(stats.isFile(), realStats.isFile());
				assert.equal(stats.isDirectory(), realStats.isDirectory());

				done();
			});
		});
	});

});

describe('readdir', function() {

	var fq = new FileQueue();

	it('should return all filenames', function(done) {

		fq.readdir(dir, function(err, files) {

			assert.ifError(err);

			fs.readdir(dir, function(err, _files) {

				assert.ifError(err);

				assert.equal(_files.length, files.length);

				done();
			});
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

