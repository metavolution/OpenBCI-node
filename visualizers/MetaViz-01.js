
// Constructor
var MetaViz = function(type, channelnum) {
  this.type = type;

}
// properties and methods
MetaViz.prototype = {
  type: 1,
  channelnum: 2,
  sizeX: 800,
	sizeY: 600,

  setType: function(type_p) {
    this.type = type_p;
  },


  addDataSet: function(data) {
    
  }



  render: function() {
    
  }

};

// node.js module export
module.exports = MetaViz;



// constructor call
var object = new MetaViz(1, 2);
