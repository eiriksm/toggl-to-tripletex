'use strict';
module.exports = function(casper) {
  var logger = require('./logger')(casper);
  return function(state) {
    // If we don't know the row, we must create it.
    if (!state.hasRow) {
      logger('Trying to insert a new row');
      casper.evaluate(function() {
        $('#newRowButton').click();
      });
    }
    else {
      logger('Have row in current screen');
    }
  };
};
