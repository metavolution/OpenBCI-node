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
    var data, ch, k, v, i, vv, _to;
    opts == null && (opts = {});
    console.log("-> EDFReader");
    this.h = {};
    this.i = 0;
    this.recordNum = 0;
    this.sampleNum = 0;
    data = Fs.readFileSync(device);
    this.buf = data;
    __importAll(this.h, {
      dataFormat: this.Str(8),
      localPatient: this.Str(80),
      localRecorder: this.Str(80),
      recordingStartDate: this.Str(8),
      recordingStartTime: this.Str(8),
      headerRecordBytes: 1 * this.Str(8),
      manufacturerID: this.Str(44),
      dataRecordCount: 1 * this.Str(8),
      dataRecordSeconds: 1 * this.Str(8),
      dataRecordChannels: 1 * this.Str(4),
      chan: []
    });
    this.h.headerRecordBytes = 256 * (this.h.dataRecordChannels + 1);
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
      for (i = 0, _to = this.h.dataRecordChannels; i < _to; ++i) {
        if (typeof this.h.chan[i] !== 'object') {
          this.h.chan[i] = {};
        }
        vv = this.Str(v);
        this.h.chan[i][k] = isFinite(vv) ? 1 * vv : vv;
      }
    }
    this.sampleCount = this.h.chan[0].sampleCount;
    this.dataRecordChunkSize = this.sampleCount * this.h.dataRecordChannels * 2;
    this.h.dataRecordCount = this.dataRecordCount = Math.floor((this.buf.length - this.h.headerRecordBytes) / this.dataRecordChunkSize);
    console.log("before start", this.h);
  }
  prototype.start = function(){
    this.interval = this.h.dataRecordSeconds * this.h.chan[0].sampleCount / 1000;
    this.state = 'playing';
    this.startTime = new Date().getTime() - this.recordNum / this.h.dataRecordSeconds * 1000 - this.sampleNum / this.sampleCount * 1000;
    return this.updateLoop();
  };
  prototype.stop = function(){
    return this.state = 'paused';
  };
  prototype.seek = function(ms){
    var sec;
    if (ms <= 1 && ms >= 0) {
      sec = ms * this.dataRecordCount * this.h.dataRecordSeconds;
    } else {
      sec = ms / 1000;
    }
    this.sampleNum = Math.floor(sec % this.h.dataRecordSeconds / this.sampleCount);
    this.recordNum = Math.floor(sec / this.h.dataRecordSeconds);
    return console.log("seek " + ms + " " + sec + " " + this.sampleNum + " " + this.recordNum);
  };
  prototype.header = function(){
    return this.h;
  };
  prototype.updateLoop = function(){
    var sample, offset, i, diff, _to, _this = this;
    sample = new Array(this.h.dataRecordChannels);
    offset = this.h.headerRecordBytes + this.recordNum * this.dataRecordChunkSize;
    for (i = 0, _to = this.h.dataRecordChannels; i < _to; ++i) {
      sample[i] = this.buf.readInt16LE(offset + 2 * (this.sampleNum + i * this.sampleCount), true);
    }
    this.emit('data', sample);
    if (++this.sampleNum > this.sampleCount) {
      this.sampleNum = 0;
      this.recordNum++;
    }
    if (this.recordNum <= this.dataRecordCount && this.state === 'playing') {
      diff = this.startTime + this.recordNum / this.h.dataRecordSeconds * 1000 + this.sampleNum / this.sampleCount * 1000 - new Date().getTime();
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
function __importAll(obj, src){
  for (var key in src) obj[key] = src[key];
  return obj;
}