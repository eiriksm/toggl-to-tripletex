'use strict';
var proxyquire =  require('proxyquire');
var mockSpawn = require('mock-spawn');
var mySpawn = mockSpawn();
mySpawn.setDefault(mySpawn.simple(1, 'test', 'test2'));
require('should');

var mockData = [
  { id: 123,
    pid: 456,
    duration: 3600,
    description: 'Test description',
    tags: [ 'bug fixing' ]
  },
  { id: 123,
    pid: 456,
    duration: 3600,
    description: 'Test description',
    tags: [ 'bug fixing' ]
  },
  { id: 123,
    pid: 456,
    duration: 3600,
    description: 'Test description 2',
    tags: [ 'bug fixing' ]
  }
];

function mockToggl(conf) {
  this.conf = conf;
}

var mockProcess = function(from, to, cb) {
  cb(new Error('mock it'));
};

var mockChildProcess = {
  spawn: mySpawn
};

mockToggl.prototype.getTimeEntries = function (from, to, cb) {
  mockProcess(from, to, cb);
};

describe('Module export', function() {
  it('Should export the expected type', function() {
    require('..').should.be.instanceOf(Function);
  });
  it('Should do what we expect', function() {
    var ttt = proxyquire('..', {
      'toggl-api': mockToggl
    });
    ttt.should.throw(new Error('mock it'));
  });
});

describe('End to end', function() {
  it('Should throw without mappings', function() {
    mockProcess = function(from, to, cb) {
      cb(null, mockData);
    };
    var ttt = proxyquire('..', {
      'toggl-api': mockToggl,
      './config': {
        mappings: {}
      }
    });
    ttt.should.throw('No mapping for activity. Activity text was: Test description');
  });
  it('Should throw without toggl tag mappings', function() {
    var ttt = proxyquire('..', {
      'toggl-api': mockToggl,
      './config': {
        mappings: {
          456: {
            name: 'test project',
            id: 1
          }
        }
      }
    });
    ttt.should.throw('No mapping found for toggl tag bug fixing');
  });
  it('Should start spawn with the expected params', function() {
    var ttt = proxyquire('..', {
      'toggl-api': mockToggl,
      'child_process': mockChildProcess,
      './config': {
        mappings: {
          456: {
            name: 'test project',
            id: 1
          }
        },
        activityMappings: {
          'bug fixing': 10
        },
        texUser: 'test@test.com',
        texPass: 'testPass'
      }
    });
    ttt();
    mySpawn.calls[0].args[0].should.equal('poster.js');
    JSON.parse(mySpawn.calls[0].args[1]).entries.should.eql({ '110':
      { id: 1,
        name: 'test project',
        activity: 10,
        duration: 3,
        text: 'Test description 2\nTest description\n',
        usedText: { 'Test description': true, 'Test description 2': true } } }
    );
  });
});
