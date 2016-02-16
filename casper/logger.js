module.exports = function(casper) {
  function logger(str, sev) {
    if (!sev) {
      sev = 'INFO';
    }
    str = '[' + sev + '] ' + new Date().toString() + ': ' + str;
    casper.echo(str);
  }
  return logger;
};
