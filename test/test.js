'use strict';
var proxyquire =  require('proxyquire');
var mockSpawn = require('mock-spawn');
var mySpawn = mockSpawn();
mySpawn.setDefault(mySpawn.simple(1, '', 'test', 'test2'));
mySpawn.sequence.add(function (cb) {
  /* eslint-disable quotes */
  this.stdout.write("\n");
  this.stderr.write("\n");
  /* eslint-enable quotes */
  this.stdout.write('a');
  cb();
});
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
    ttt(function(err) {
      err.should.eql(new Error('mock it'));
    });
  });
});

describe('End to end', function() {
  it('Should throw when there is activites without tags', function() {
    mockProcess = function(from, to, cb) {
      cb(null, [
        {
          id: 123,
          pid: 456,
          duration: 1,
          description: 'Test without tag'
        }
      ]);
    };
    proxyquire('..', {
      'toggl-api': mockToggl,
      './config': {
        mappings: {
          456: {
            name: 'test project',
            id: 1
          }
        }
      }
    })(function(err) {
      err.should.eql(new Error('No tag supplied for activity: Test without tag'));
    });
  });
  it('Should throw without mappings', function() {
    mockProcess = function(from, to, cb) {
      cb(null, mockData);
    };
    proxyquire('..', {
      'toggl-api': mockToggl,
      './config': {
        mappings: {}
      }
    })(function(err) {
      err.should.eql(new Error('No mapping for activity. Activity text was: Test description'));
    });
  });
  it('Should throw without toggl tag mappings', function(done) {
    var d = false;
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
    ttt(function(err) {
      // Since we re-use the stream thing, just see if we are done or not.
      if (d) {
        return;
      }
      d = true;
      err.should.eql(new Error('No mapping found for toggl tag bug fixing'));
      done();
    });
  });
  it('Should throw when exit code is 1', function(done) {
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
    ttt(function(err) {
      mySpawn.calls[0].args[0].should.equal('casper/poster.js');
      JSON.parse(mySpawn.calls[0].args[1]).entries.should.eql({ '110':
        { id: 1,
          name: 'test project',
          activity: 10,
          duration: 3,
          text: 'Test description 2\nTest description\n',
          usedText: { 'Test description': true, 'Test description 2': true } } }
      );
      done();
      err.should.eql(new Error('Problematic run detected'));
    });
  });
  it('Should start spawn with the expected params', function(done) {
    mySpawn.setDefault(mySpawn.simple(0, '', 'test', 'test2'));
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
    ttt(function(err) {
      mySpawn.calls[0].args[0].should.equal('casper/poster.js');
      JSON.parse(mySpawn.calls[1].args[1]).entries.should.eql({ '110':
        { id: 1,
          name: 'test project',
          activity: 10,
          duration: 3,
          text: 'Test description 2\nTest description\n',
          usedText: { 'Test description': true, 'Test description 2': true } } }
      );
      done(err);
    });
  });
  it('Should sum things in the expected way', function(done) {
    mockData = [
      { id: 123,
        pid: 456,
        duration: 300,
        description: 'Test description',
        tags: [ 'bug fixing' ]
      },
      { id: 123,
        pid: 456,
        duration: 300,
        description: 'Test description',
        tags: [ 'bug fixing' ]
      }
    ];
    mockProcess = function(from, to, cb) {
      cb(null, mockData);
    };
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
    ttt(function(err) {
      JSON.parse(mySpawn.calls[2].args[1]).duration.should.equal(0.25);
      done(err);
    });
  });
});
