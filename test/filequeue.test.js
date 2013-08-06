// Run this with "mocha filequeue.test.js"

var assert = require('assert');
var temp = require('temp');
var fs = require('fs');
var path = require('path');

var FileQueue = require('../lib/filequeue');

var dir = temp.mkdirSync('filequeue-test-');

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

// set `newQueue` to true so we don't get the instance with a limit of 2000
var fq = new FileQueue(true);

describe('readFile', function() {

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
				fq.readFile(makePath('my_other_path'), {encoding: 'utf8'}, function(err, data) {

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

	it('should create symlink with optional "type" argument', function() {

		// only applicable on windows environments, which I don't have a box for
	});
});

describe('writeFile', function() {

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

	it('should check if a file exists', function(done) {

		fq.exists(makePath('my_path'), function(exists) {

			assert.equal(exists, fs.existsSync(makePath('my_path')));

			done();
		});
	});

	it('should confirm that a file does not exist', function(done) {

		fq.exists(makePath('this_file_doesnt_exist'), function(exists) {

			assert.equal(exists, fs.existsSync(makePath('this_file_doesnt_exist')));

			done();
		});
	});


});

describe('mkdir', function() {

	function modeString(stats) {
		return '0' + (stats.mode & parseInt('777', 8)).toString(8);
	}

	// change the default mask so it doesn't affect the ops below
	process.umask(0000);

	it('should create a new directory with the default mode', function(done) {
		var dirname = 'newdir';

		fq.mkdir(makePath(dirname), function(err) {
			assert.ifError(err);

			var stats = fs.statSync(makePath(dirname));

			assert.equal(stats.isDirectory(), true);
			assert.equal(modeString(stats), '0777');

			done();
		});
	});

	it('should create a new directory with a custom mode', function(done) {
		var dirname = 'otherpath';
		var mode = '0666';
		fq.mkdir(makePath(dirname), mode, function(err) {
			assert.ifError(err);

			var stats = fs.statSync(makePath(dirname));

			assert.equal(stats.isDirectory(), true);
			assert.equal(modeString(stats), mode);

			done();
		});
	});

});

describe('readStream', function() {

	it('creates a ReadStream', function() {

		var stream = fq.createReadStream(makePath('my_path'), {encoding: 'utf8'});

		assert.ok(stream instanceof fs.ReadStream);
	});

	it('reads data from a ReadStream', function(done) {

		var stream = fq.createReadStream(makePath('my_path'), {encoding: 'utf8'});

		var my_path_string = '';

		stream.on('data', function(data) {

			my_path_string += data;
		});

		stream.on('error', function(err) {

			assert.ifError(err);
		});

		stream.on('close', function() {

			assert.equal(my_path_string, fs.readFileSync(makePath('my_path'), {encoding: 'utf8'}));

			done();
		});
	});

	it('reads data from lots of streams without crashing', function(done) {

		var my_path_string = fs.readFileSync(makePath('my_path'), {encoding: 'utf8'});

		var count = 0,
			streams = [];

		for(var i=0;i<1000;i++) {

			(function(i) {

				streams.push(fq.createReadStream(makePath('my_path'), {encoding: 'utf8'}));

				streams[i].fq_data = '';

				streams[i].on('data', function(data) {

					streams[i].fq_data += data;
				});

				streams[i].on('error', function(err) {

					assert.ifError(err);
				});

				streams[i].on('close', function() {

					assert.equal(my_path_string, streams[i].fq_data);

					if(++count >= 1000) {
						done();
					}
				});

			})(i);
		}
	});

});

describe('writeStream', function() {

	it('creates a WriteStream', function() {

		var stream = fq.createWriteStream(makePath('my_path'), {encoding: 'utf8'});

		assert.ok(stream instanceof fs.WriteStream);

		stream.end();
	});

	it('writes data to a WriteStream', function(done) {

		var stream = fq.createWriteStream(makePath('my_writing_path'), {encoding: 'utf8'});

		stream.on('error', function(err) {

			assert.ifError(err);
		});

		var my_path_arr = 'this is some data that I want to write'.split(' ');

		var i = 0;
		function write() {

			stream.write(my_path_arr[i], 'utf8', function() {

				i++;

				if(i < my_path_arr.length) {
					write();
				} else {

					stream.end(function() {

						assert.equal(my_path_arr.join(''), fs.readFileSync(makePath('my_writing_path'), {encoding: 'utf8'}));

						done();
					});
				}
			});
		}

		write();
	});

	it('writes data to lots of streams without crashing', function(done) {
		done();

		var my_path_arr = 'this is some data that I want to write'.split(' ');

		function write(stream) {

			stream.write(my_path_arr[stream.i], 'utf8', function() {

				stream.i++;

				if(stream.i < my_path_arr.length) {
					write(stream);
				} else {

					stream.end(function() {

						assert.equal(my_path_arr.join(''), fs.readFileSync(makePath('my_other_writing_path'), {encoding: 'utf8'}));

						done();
					});
				}
			});
		}

		var count = 0,
			streams = [];

		for(var i=0;i<1000;i++) {

			streams.push(fq.createWriteStream(makePath('my_other_writing_path'), {encoding: 'utf8'}));

			streams[i].i = 0;

			write(streams[i]);

		}
	});
});

