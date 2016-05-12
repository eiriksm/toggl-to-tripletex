module.exports = function(casper) {
  var logger = require('./logger')(casper);
  return function(en, state) {
    state.selector = 'td a[title="' + en.id + ' ' + en.name + '"]';
    logger('Starting findRow module. Using selector "' + state.selector + '" and activity name "' + en.activity + '"');
    state.hasRow = casper.evaluate(function(selector, activity) {
      var hasNext = false;
      jQuery(selector).each(function() {
        if ($(this).closest('td').next().text().trimLeft().indexOf(activity) === 0) {
          hasNext = true;
        }
      });
      return jQuery(selector).length > 0 &&
        hasNext;
    }, state.selector, en.activity);
    logger('Has row is ' + state.hasRow);
    state.hasFirstRow = state.hasRow;
  };
};
