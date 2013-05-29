// All of the fs methods we want exposed on fq
module.exports = [
	{
		name: 'readFile',
		args: [
			{
				name: 'filename',
				type: 'string',
				required: true
			},
			{
				name: 'encoding',
				type: 'string',
				required: false
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},
	
	{
		name: 'rename',
		args: [
			{
				name: 'oldPath',
				type: 'string',
				required: true
			},
			{
				name: 'newPath',
				type: 'string',
				required: true
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},	

	{
		name: 'symlink',
		args: [
			{
				name: 'srcpath',
				type: 'string',
				required: true
			},
			{
				name: 'dstpath',
				type: 'string',
				required: true
			},
			{
				name: 'type',
				type: 'string',
				required: false,
				'default': 'file'
			},
			{
				name: 'callback',
				type: 'function',
				required: true
			}
		]
	},	

	{
		name: 'writeFile',
		args: [
			{
				name: 'filename',
				type: 'string',
				required: true
			},
			{
				name: 'data',
				type: function(arg) {
					if(typeof arg === 'string') {
						return true;
					}
					if(arg instanceof Buffer) {
						return true;
					}
					return false;
				},
				required: true
			},
			{
				name: 'encoding',
				type: 'string',
				required: false
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},

	{
		name: 'stat',
		args: [
			{
				name: 'path',
				type: 'string',
				required: true
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},

	{
		name: 'readdir',
		args: [
			{
				name: 'path',
				type: 'string',
				required: true
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},

	{
		name: 'exists',
		args: [
			{
				name: 'path',
				type: 'string',
				required: true
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	},

	{
		name: 'mkdir',
		args: [
			{
				name: 'path',
				type: 'string',
				required: true
			},
			{
				name: 'mode',
				type: 'string',
				required: false
			},
			{
				name: 'callback',
				type: 'function',
				required: false,
				'default': function() {}
			}
		]
	}
];