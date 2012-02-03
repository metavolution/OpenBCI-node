OpenBCI
===

right now, there is only an EDF reader. this can be used like so:


```
openbci = require('openbci');

edf = new openbci.EDFReader 'test/2011-madrid-kenny-01.edf'

edf.on('data', function(data) {
	right = data[0]
	left = data[1]
	console.log('data:', data)
});

```
