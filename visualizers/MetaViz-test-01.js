
openbci = require('openbci');
metaviz = require('metaviz');

edf = new openbci.EDFReader '../brainwave-db/2011-madrid-kenny-01.edf'
metaviz1 = new metaviz.MetaViz(1, 2);


edf.on('data', function(data) {

    right = data[0]
    left = data[1]
    console.log('data:', data)

		metaviz1.addDataSet(data)
		metaviz1.render()

});
