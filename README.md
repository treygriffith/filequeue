Filequeue
==============
### Drop-in Replacement for `fs` that avoids `Error: EMFILE, too many open files`.

`Filequeue` was born out of my encounter with `Error: EMFILE, too many open files`, which occurs when you try to open too many files at once on your system. Due to Node's asynchronous nature, if you perform a lot of `fs.readFile` or similar operations in quick succession, you can easily hit your system's `maxfiles` limit, usually set to 256 on a dev box.

`Filequeue` creates a replacement for `fs`, that I use as `fq` with many of the same operations. However, it keeps track of how many files are open at once, and queues them if there are too many.

Installation
-------------

Through [NPM](http://www.npmjs.org)
``` bash
$ npm install filequeue
```

 or using Git
``` bash
$ git clone git://github.com/treygriffith/filequeue.git node_modules/filequeue/
```

How to Use
-----------

#### Instantiate Filequeue with a maximum number of files to be opened at once (default is 200)

``` javascript
  var FileQueue = require('filequeue');
  var fq = new FileQueue(100);

  // additional instances will attempt to use the same instance (and therefore the same maxfiles)

  var FileQueue2 = require('filequeue');
  var fq2 = new FileQueue2(100);

  console.log(fq === fq2); // => true

  // you can force a new instance of filequeue with the `newQueue` parameter

  var fq3 = new FileQueue(100, true);

  console.log(fq === fq3); // => false

```

#### Use any of the following supported `fs` methods
* [readFile](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_readfile_filename_encoding_callback)
* [writeFile](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_writefile_filename_data_encoding_callback) - Note that Node 0.10.0 introduced a different parameter signature, and is therefore incompatible with the current version of Filequeue (0.3.0)
* [readdir](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_readdir_path_callback)
* [rename](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_rename_oldpath_newpath_callback)
* [symlink](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_symlink_srcpath_dstpath_type_callback)
* [mkdir](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_mkdir_path_mode_callback)
* [stat](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_stat_path_callback)
* [exists](http://nodejs.org/docs/v0.8.0/api/fs.html#fs_fs_exists_path_callback)

``` javascript
  for(var i=0; i<1000; i++) {
    fq.readFile('/somefile.txt', function(err, somefile) {
      console.log("data from somefile.txt without crashing!", somefile);
    });
  }
```

Other Methods
-------------
Add a new `fs` method is simple, just add it to the `methods.js` file with the name and the arguments.

Pull requests to add other fs methods with tests exercising them are welcome.
