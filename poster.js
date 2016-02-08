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
casper.on('page.error', function(msg) {
  this.echo('Error: ' + msg, 'ERROR');
});
casper.on('remote.message', function(d) {
  console.log(d);
});
var opts = JSON.parse(casper.cli.args[0]);
var user = opts.user;
var pass = opts.pass;
function logger(str, sev) {
  if (!sev) {
    sev = 'INFO';
  }
  str = new Date().toString() + ':' + str;
  casper.echo(str, sev);
}
var counter = 0;
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

function createRun(entry) {
  var hasRow = false;
  var hasFirstRow = false;
  casper.then(function(en) {
    hasRow = casper.evaluate(function(id, name, activity) {
      var hasNext = false;
      jQuery('td a[title="' + id + ' ' + name + '"]').each(function() {
        if ($(this).closest('td').next().text().indexOf(activity) === 0) {
          hasNext = true;
        }
      });
      return jQuery('td a[title="' + id + ' ' + name + '"]').length > 0 &&
        hasNext;
    }, en.id, en.name, en.activity);
    logger('Has row is ' + hasRow);
    hasFirstRow = hasRow;
  }.bind(this, entry));
  casper.then(function() {
    // If we don't know the row, we must create it.
    if (!hasRow) {
      logger('Trying to insert a new row');
      casper.evaluate(function() {
        $('th button').click();
      });
    }
    else {
      logger('Have row in current screen');
    }
  }.bind(this, entry));
  casper.waitFor(function() {
    return hasRow || casper.evaluate(function() {
      return $($('.contentTable > .newWeeks')[0]).css('display') != 'none';
    });
  }, function then(en) {
    if (!hasRow) {
      logger('Clicking dropdown for project list');
      screenShot('dropDownReady' + en.id + '-' + en.activity);
      casper.evaluate(function() {
        $($($('.newWeeks')[0]).find('.tlxSelectWrapper span')[0]).click();
      });
    }
  }.bind(this, entry), function timeout(en) {
    logger('No dropdown found to click!');
    screenShot('waitForDropdownError' + en.id + '-' + en.activity);
  }.bind(this, entry));
  casper.waitFor(function check() {
    return hasRow || casper.evaluate(function() {
      return $('.tlxSelectListTable tr').length > 0;
    });
  }, function then(en) {
    if (!hasRow) {
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
    logger('Timed out waiting for the project list', 'ERROR');
    screenShot('listtimeout' + en.id + '-' + en.activity);
  }.bind(this, entry), 10000);
  casper.then(function(en) {
    // Add the activity.
    if (!hasRow) {
      logger('Trying to add activity');
      screenShot('addAct' + en.id + '-' + en.activity);
      casper.evaluate(function() {
        $($($('.newWeeks')[0]).find('.tlxSelectWrapper span')[1]).click();
      });
    }
  }.bind(this, entry));
  casper.waitFor(function check() {
    return hasRow || casper.evaluate(function() {
      return $('.tlxSelectListTable tr').length > 0;
    });
  }, function then(en) {
    if (!hasRow) {
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
      hasRow = true;
    }
  }.bind(this, entry), function timeout(en) {
    logger('timed out waiting for activity list', 'ERROR');
    screenShot('activitywaittimeout' + en.id + '-' + en.activity);
  }.bind(this, entry), 10000);
  casper.then(function(en) {
    if (hasRow) {
      // Insert the hours on the current day. Which is 3 for monday and so on.
      // Since I don't usually work on sundays, that means new Date().getDay()
      // + 2.
      logger('Trying to fill in hour for ' + en.name);
      logger('hasFirstRow is ' + hasFirstRow);
      if (hasFirstRow) {
        casper.evaluate(function(id, name, activity, hours, text) {
          var delta = new Date().getDay() + 2;
          jQuery('td a[title="' + id + ' ' + name + '"]').each(function(j, k) {
            if ($(k).closest('td').next().text().indexOf(activity) === 0) {
              $($(k).closest('tr').find('td')[delta]).find('input[type="text"]').focus();
              $($(k).closest('tr').find('td')[delta]).find('input[type="text"]').val(hours)
                .closest('tr').next().find('textarea')
                .val(text)
                .focus()
                .blur();
            }
          });
        }, en.id, en.name, en.activity, en.duration, en.text);
      }
      else {
        casper.evaluate(function(id, name, activity, hours, text) {
          var delta = new Date().getDay() + 2;
          $($($('.newWeeks')[0]).find('.hoursRow').find('td')[delta]).find('input[type="text"]').focus();
          $($($('.newWeeks')[0]).find('.hoursRow').find('td')[delta]).find('input[type="text"]').val(hours)
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
        logger('Saved list');
        screenShot('savedList' + en.id + '-' + en.activity);
      }.bind(this, entry), function timeout(en) {
        logger('Could not save list. Hope it works on next round!');
        screenShot('waitForSaveError' + en.id + '-' + en.activity);
      }.bind(this, entry));
    }
    else {
      logger('Should have had a row, but does not. Too bad, eh?');
      screenShot('norow' + en.id + '-' + en.activity);
    }
  }.bind(this, entry));
}

for (var i in opts.entries) {
  createRun(opts.entries[i]);
}
casper.run();
