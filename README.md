OpenBCI
===

right now, there is only an EDF reader. it can be used like so:

```
openbci = require('openbci');

edf = new openbci.EDFReader('test/2011-madrid-kenny-01.edf');

edf.on('data', function(data) {
	right = data[0];
	left = data[1];
	console.log('data:', data);
});

// begin the stream
edf.start()

// control the stream
edf.pause();
edf.play();
edf.seek(0.5); // go to halfway
edf.seek(5000); // go to 5.0 seconds
```