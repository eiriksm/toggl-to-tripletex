/*global jQuery, $ */
'use strict';
var casper = require('casper').create({
  viewportSize: {
    width: 800,
    height: 800
  }
  //,verbose: true,
  //logLevel: "debug"
});
var opts = JSON.parse(casper.cli.args[0]);
var user = opts.user;
var pass = opts.pass;
var counter = 0;

var logger = require('./logger')(casper);
casper.on('page.error', function(msg) {
  logger('Error from browser: ' + msg, 'ERROR');
});
casper.on('remote.message', function(d) {
  logger('console.log from browser: ' + d);
});

function pad(num, size) {
  var s = '000000000' + num;
  return s.substr(s.length-size);
}

function screenShot(name) {
  name = pad(counter, 2) + name;
  logger('Capturing screenshot named ' + name);
  casper.capture('shots/' + name + '.png', {
    top: 0,
    left: 0,
    width: 800,
    height: 800
  });
  counter++;
}

function clickDropdown(en, type, hasRow) {
  if (!hasRow) {
    logger(type + ' dropdown ready. Trying to click');
    screenShot(type + 'DropdownReady' + en.id + '-' + en.activity);
    var delta = 0;
    if (type == 'activity') {
      delta = 1;
    }
    casper.evaluate(function(d) {
      $($($('.newWeeks')[0]).find('.tlxSelectWrapper span')[d]).click();
    }, delta);
  }
}

function logEntryAndScreenshot(text, file, severity) {
  logger(text, severity);
  screenShot(file);
}

function createRun(entry) {
  var state = {};
  casper.then(require('./findRow')(casper).bind(this, entry, state));
  casper.then(require('./createRowIfNotExists')(casper).bind(this, state));
  casper.waitFor(function() {
    return state.hasRow || casper.evaluate(function() {
      return $($('.contentTable > .newWeeks')[0]).css('display') != 'none';
    });
  }, function then(en) {
    clickDropdown(en, 'project', state.hasRow);
  }.bind(this, entry), function timeout(en) {
    logEntryAndScreenshot('No dropdown found to click!', 'waitForDropdownError' + en.id + '-' + en.activity);
  }.bind(this, entry));
  casper.waitFor(function check() {
    return state.hasRow || casper.evaluate(function() {
      return $('.tlxSelectListTable tr').length > 0;
    });
  }, function then(en) {
    if (!state.hasRow) {
      logger('Done waiting for project list');
      screenShot('projectList' + en.id + '-' + en.activity);
      // Click the row with the text of this project.
      casper.evaluate(function(id, name) {
        $('.tlxSelectListTable tr').each(function(i, n) {
          if ($(n).text().indexOf(id + ' ' + name) > -1) {
            $(n).find('span').click();
          }
        });
      }, en.id, en.name);
      screenShot('projectListClicked' + en.id + '-' + en.activity);
    }
  }.bind(this, entry), function timeout(en) {
    logEntryAndScreenshot('Timed out waiting for the project list', 'listtimeout' + en.id + '-' + en.activity, 'ERROR');
  }.bind(this, entry), 10000);
  casper.then(function(en) {
    clickDropdown(en, 'activity', state.hasRow);
  }.bind(this, entry));
  casper.waitFor(function check() {
    return state.hasRow || casper.evaluate(function() {
      return $('.tlxSelectListTable tr').length > 0;
    });
  }, function then(en) {
    if (!state.hasRow) {
      if (en.activity != 1) {
        logger('Will try to click on the activity list');
        // Add the activity requested. Unless it is 1 (default).
        casper.evaluate(function(activity) {
          $('.tlxSelectListTable tr').each(function(i, n) {
            if ($(n).text().indexOf(activity) === 0) {
              $(n).find('span').click();
            }
          });
        }, en.activity);
      }
      else {
        logger('Using default activity, because activity is ' + en.activity);
      }
      state.hasRow = true;
    }
  }.bind(this, entry), function timeout(en) {
    logEntryAndScreenshot('Timed out waiting for activity list', 'activitywaittimeout' + en.id + '-' + en.activity, 'ERROR');
  }.bind(this, entry), 10000);
  casper.then(function(en) {
    if (state.hasRow) {
      // Insert the hours on the current day. Which is 3 for monday and so on.
      // Since I don't usually work on sundays, that means new Date().getDay()
      // + 2.
      logger('Trying to fill in hour for ' + en.name);
      logger('hasFirstRow is ' + state.hasFirstRow);
      if (state.hasFirstRow) {
        casper.evaluate(function(selector, activity, hours, text) {
          var delta = new Date().getDay() + 2;
          jQuery(selector).each(function(j, k) {
            if ($(k).closest('td').next().text().trimLeft().indexOf(activity) === 0) {
              var textInput = $($(k).closest('tr').find('td')[delta]).find('input[type="text"]');
              textInput.focus();
              textInput.val(hours)
                .closest('tr').next().find('textarea')
                .val(text)
                .focus()
                .blur();
            }
          });
        }, state.selector, en.activity, en.duration, en.text);
      }
      else {
        casper.evaluate(function(id, name, activity, hours, text) {
          var delta = new Date().getDay() + 2;
          var textInput = $($($('.newWeeks')[0]).find('.hoursRow').find('td')[delta]).find('input[type="text"]');
          textInput.focus();
          textInput.val(hours)
            .closest('tr').next().find('textarea')
            .val(text)
            .focus()
            .blur();
        }, en.id, en.name, en.activity, en.duration, en.text);
      }
      screenShot('filledHour' + en.id + '-' + en.activity);
      casper.then(function() {
        // Click save.
        logger('Trying to click save');
        casper.evaluate(function() {
          $($('#ajaxContenttoolbarContainer button')[0]).click();
        });
      });
      casper.waitFor(function() {
        return casper.evaluate(function() {
          return jQuery('.ui-widget-overlay.tlx-overlay').css('display') == 'none';
        });
      }, function then(en) {
        logEntryAndScreenshot('Saved list', 'savedList' + en.id + '-' + en.activity);
      }.bind(this, entry), function timeout(en) {
        logEntryAndScreenshot('Could not save list. Hope it works on next round!', 'waitForSaveError' + en.id + '-' + en.activity);
      }.bind(this, entry));
    }
    else {
      logger('Should have had a row, but does not. Too bad, eh?');
      screenShot('norow' + en.id + '-' + en.activity);
    }
  }.bind(this, entry));
}

casper.start('https://tripletex.no/execute/login?site=no', function() {
  logger('Filling out login form');
  this.fill('#LoginForm', {
    username: user,
    password: pass
  }, true);
  screenShot('filled');
});

casper.waitForSelector('#logoutButton', function() {
  logger('Success logging in');
  screenShot('succlogin');
}, function err() {
  logger('Error logging in', 'ERROR');
  screenShot('errorLogin');
}, 30000);

for (var i in opts.entries) {
  createRun(opts.entries[i]);
}

casper.then(function() {
  // Try to compare what we tried to save to what we have saved.
  var hours = casper.evaluate(function() {
    var day = new Date().getDay() - 1;
    return parseFloat($($('#ajaxContenthourListTable tr:eq(-1)').find('.hourlistSum')[day]).text().replace(',', '.'));
  });
  if (hours != opts.duration) {
    logger('Did not save all hours, unfortunately. I am a bad robot, sorry! Duration sent was ' + opts.duration + '. Saved hours was ' + hours);
    casper.exit(1);
  }
});
casper.run();
