module.exports = function(casper) {
  var logger = require('./logger')(casper);
  return function(en, hr, hfr) {
    hr = casper.evaluate(function(id, name, activity) {
      var hasNext = false;
      jQuery('td a[title="' + id + ' ' + name + '"]').each(function() {
        if ($(this).closest('td').next().text().indexOf(activity) === 0) {
          hasNext = true;
        }
      });
      return jQuery('td a[title="' + id + ' ' + name + '"]').length > 0 &&
        hasNext;
    }, en.id, en.name, en.activity);
    logger('Has row is ' + hr);
    hfr = hr;
  };
}
