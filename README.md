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

#### Instantiate Filequeue with a maximim number of files to be opened at once (default is 200)

``` javascript
  var FileQueue = require('filequeue');
  var fq = new FileQueue(100);

  // additional instances will attempt to use the same instance (and therefore the same maxfiles) unless the `newQueue` is explicitly passed.

  var FileQueue2 = require('filequeue');
  var fq2 = new FileQueue(100);

  console.log(fq === fq2); // => true
```

#### Use any of the following supported `fs` methods
* readFile
* writeFile
* readdir
* stat
* exists

``` javascript
  for(var i=0; i<1000; i++) {
    fq.readFile('/somefile.txt', function(err, somefile) {
      console.log("data from somefile.txt without crashing!", somefile);
    });
  }
```

Other Methods
-------------
Pull requests to add other fs methods are welcome - these are the methods I use most often, so I built in support for them.