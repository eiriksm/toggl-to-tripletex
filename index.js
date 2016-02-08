'use strict';
var spawn = require('child_process').spawn;
var config = require('./config');
var TogglClient = require('toggl-api');
var toggl = new TogglClient({apiToken: config.apiKey});
var mo = require('moment');
var entries = {};
var mappings = config.mappings;
toggl.getTimeEntries(mo(1, 'h').format(), mo(19, 'h').format(), function(err, data) {
  if (err) {
    throw new Error(err);
  }
  data.forEach(function(n) {
    var m = mappings[n.pid];
    if (!m) {
      throw new Error('No mapping for activity. Activity text was: ' + n.description);
    }
    var duration = Number((Math.round((n.duration / 3600) * 4) / 4).toFixed(2));
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
    entries[key].duration = entries[key].duration + duration;
  });
  // Spawn a process with this as arguments.
  var p = spawn('casperjs', ['poster.js', JSON.stringify({
    entries: entries,
    user: config.texUser,
    pass: config.texPass
  })]);
  p.stdout.on('data', function(data) {
    console.log(data.toString());
  });
  p.stderr.on('data', function(d) {
    console.log('err', d.toString());
  });
  p.on('close', function(c) {
    console.log('close', c);
  });

});
