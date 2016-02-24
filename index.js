'use strict';
var spawn = require('child_process').spawn;
var config = require('./config');
var TogglClient = require('toggl-api');
var toggl = new TogglClient({apiToken: config.apiKey});
var mo = require('moment');
var entries = {};
var mappings = config.mappings;
var totalDuration = 0;
module.exports = function(callback) {
  toggl.getTimeEntries(mo(1, 'h').format(), mo(19, 'h').format(), function(err, data) {
    if (err) {
      return callback(err);
    }
    var error = false;
    data.forEach(function(n) {
      if (error) {
        return;
      }
      var m = mappings[n.pid];
      if (!m) {
        console.log(n);
        error = new Error('No mapping for activity. Activity text was: ' + n.description);
        return;
      }
      if (!n.tags || !n.tags.length) {
        return callback(new Error('No tag supplied for activity: ' + n.description));
      }
      if (!config.activityMappings[n.tags[0]]) {
        return callback(new Error('No mapping found for toggl tag ' + n.tags[0]));
      }
      var key = '' + m.id + config.activityMappings[n.tags[0]];
      if (!entries[key]) {
        entries[key] = {
          id: m.id,
          name: m.name,
          activity: config.activityMappings[n.tags[0]],
          duration: 0,
          text: '',
          usedText: {}
        };
      }
      if (!entries[key].usedText[n.description]) {
        /* eslint-disable quotes */
        entries[key].text = n.description + "\n" + entries[key].text;
        /* eslint-enable quotes */
        entries[key].usedText[n.description] = true;
      }
      entries[key].duration = entries[key].duration + n.duration;
    });
    Object.keys(entries).forEach(function(n) {
      var item = entries[n];
      entries[n].duration = Number((Math.ceil((item.duration / 3600) * 4) / 4).toFixed(2));
      totalDuration = totalDuration + entries[n].duration;
    });
    if (error) {
      callback(error);
      return;
    }
    // Spawn a process with this as arguments.
    var p = spawn('casperjs', ['casper/poster.js', JSON.stringify({
      entries: entries,
      user: config.texUser,
      pass: config.texPass,
      duration: totalDuration
    })]);
    var output = [];
    p.stdout.on('data', function(data) {
      output.push(data.toString());
    });
    p.stderr.on('data', function(d) {
      output.push('err: ' + d.toString());
    });
    p.on('close', function(c) {
      if (c !== 0) {
        /* eslint-disable quotes */
        process.stderr.write(output.join("\n"));
        callback(new Error('Problematic run detected'));
        /* eslint-enable quotes */
      }
      else {
        callback();
      }
    });

  });
};
