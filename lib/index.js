var Fs, Events, eegdriver, EEGDriver, EDFReader, USBDriver;
Fs = require('fs');
Events = require('events');
eegdriver = {};
EEGDriver = (function(superclass){
  EEGDriver.displayName = 'EEGDriver';
  var prototype = __extend(EEGDriver, superclass).prototype, constructor = EEGDriver;
  function EEGDriver(device, opts){
    var driver;
    opts == null && (opts = {});
    console.log("creating EEGDriver with:", device);
    driver = this.driver = new eegdriver.EEGDriver(function(err, data){
      console.log("eegdriver event: ", err, data);
      if (!err) {
        return this.emit("data", data);
      }
    });
    this.stream = Fs.createReadStream(device, {
      flags: opts.flags || 'r'
    });
    this.stream.on('open', function(fd){
      console.log("opened stream", fd);
      this.fd = fd;
      if (typeof opts.cb === 'function') {
        return cb('open', fd);
      }
    });
    this.stream.on('data', function(data){
      var i, x, _len, _results = [];
      if (typeof opts.cb === 'function') {
        return cb('data', data);
      } else {
        for (i = 0, _len = data.length; i < _len; ++i) {
          x = data[i];
          _results.push(driver.gobble(x));
        }
        return _results;
      }
    });
  }
  return EEGDriver;
}(Events.EventEmitter));
EDFReader = (function(superclass){
  EDFReader.displayName = 'EDFReader';
  var prototype = __extend(EDFReader, superclass).prototype, constructor = EDFReader;
  function EDFReader(device, opts){
    var _this = this;
    opts == null && (opts = {});
    console.log("-> EDFReader");
    Fs.readFile(device, function(err, data){
      var ch, k, v, i, vv, _to;
      _this.buf = data;
      _this.i = 0;
      _this.recordNum = 0;
      _this.sampleNum = 0;
      _this.header = {
        dataFormat: _this.Str(8),
        localPatient: _this.Str(80),
        localRecorder: _this.Str(80),
        recordingStartDate: _this.Str(8),
        recordingStartTime: _this.Str(8),
        headerRecordBytes: 1 * _this.Str(8),
        manufacturerID: _this.Str(44),
        dataRecordCount: 1 * _this.Str(8),
        dataRecordSeconds: 1 * _this.Str(8),
        dataRecordChannels: 1 * _this.Str(4),
        chan: []
      };
      _this.header.headerRecordBytes = 256 * (_this.header.dataRecordChannels + 1);
      ch = {
        label: 16,
        transducer: 80,
        dimUnit: 8,
        physMin: 8,
        physMax: 8,
        digiMin: 8,
        digiMax: 8,
        prefiltering: 80,
        sampleCount: 8,
        reserved: 32
      };
      for (k in ch) {
        v = ch[k];
        for (i = 0, _to = _this.header.dataRecordChannels; i < _to; ++i) {
          if (typeof _this.header.chan[i] !== 'object') {
            _this.header.chan[i] = {};
          }
          vv = _this.Str(v);
          _this.header.chan[i][k] = isFinite(vv) ? 1 * vv : vv;
        }
      }
      _this.sampleCount = _this.header.chan[0].sampleCount;
      _this.dataRecordChunkSize = _this.sampleCount * _this.header.dataRecordChannels * 2;
      _this.dataRecordCount = Math.floor((_this.buf.length - _this.header.headerRecordBytes) / _this.dataRecordChunkSize);
      return _this.start();
    });
  }
  prototype.start = function(){
    this.interval = this.header.dataRecordSeconds * this.header.chan[0].sampleCount / 1000;
    this.state = 'playing';
    this.startTime = new Date().getTime();
    this.updateLoop();
    return console.log("set interval for " + this.header.dataRecordSeconds * this.header.chan[0].sampleCount / 1000);
  };
  prototype.stop = function(){
    return this.state = 'paused';
  };
  prototype.updateLoop = function(){
    var sample, offset, i, diff, _to, _this = this;
    sample = new Array(this.header.dataRecordChannels);
    offset = this.header.headerRecordBytes + this.recordNum * this.dataRecordChunkSize;
    for (i = 0, _to = this.header.dataRecordChannels; i < _to; ++i) {
      sample[i] = this.buf.readInt16LE(offset + 2 * (this.sampleNum + i * this.sampleCount), true);
    }
    this.emit('data', sample);
    if (++this.sampleNum > this.sampleCount) {
      this.sampleNum = 0;
      this.recordNum++;
    }
    if (this.recordNum <= this.dataRecordCount && this.state === 'playing') {
      diff = this.startTime + this.recordNum / this.header.dataRecordSeconds * 1000 + this.sampleNum / this.sampleCount * 1000 - new Date().getTime();
      return setTimeout(function(){
        return _this.updateLoop();
      }, 0 > diff ? 0 : diff);
    }
  };
  prototype.Int32 = function(inc){
    var i;
    inc == null && (inc = 4);
    i = this.i + 4 - inc;
    this.i += inc;
    return this.buf.readInt32LE(i, true);
  };
  prototype.Double = function(inc){
    var i;
    inc == null && (inc = 8);
    i = this.i + 8 - inc;
    this.i += inc;
    return this.buf.readDoubleLE(i, true);
  };
  prototype.Str = function(len){
    var i;
    i = this.i;
    this.i += len;
    return this.buf.toString('utf8', i, i + len).trim();
  };
  return EDFReader;
}(Events.EventEmitter));
USBDriver = (function(superclass){
  USBDriver.displayName = 'USBDriver';
  var prototype = __extend(USBDriver, superclass).prototype, constructor = USBDriver;
  function USBDriver(device, opts){
    opts == null && (opts = {});
    console.log("-> USBDriver");
    superclass.call(this, device, {
      flags: 'w+',
      cb: function(fd){
        var cmd;
        cmd = new Buffer("eeg\n");
        return Fs.write(this.fd, cmd, 0, cmd.length, null, function(err, written, buffer){
          var header, cmd;
          if (err) {
            throw err;
          }
          console.log("mode eeg", written);
          header = this.driver.header();
          cmd = new Buffer(header.length + 1 + "setheader ".length);
          cmd.write("setheader ");
          header.copy(cmd, "setheader ".length);
          cmd[cmd.length - 1] = "\n";
          return Fs.write(fd, cmd, 0, cmd.length, null, function(err, written, buffer){
            if (err) {
              throw err;
            }
            return console.log("set header", written);
          });
        });
      }
    });
  }
  return USBDriver;
}(EEGDriver));
module.exports.EDFReader = EDFReader;
module.exports.USBDriver = USBDriver;
function __extend(sub, sup){
  function fun(){} fun.prototype = (sub.superclass = sup).prototype;
  (sub.prototype = new fun).constructor = sub;
  if (typeof sup.extended == 'function') sup.extended(sub);
  return sub;
}