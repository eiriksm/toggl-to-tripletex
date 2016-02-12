module.exports = function(casper) {
  function logger(str, sev) {
    if (!sev) {
      sev = 'INFO';
    }
    str = new Date().toString() + ':' + str;
    casper.echo(str, sev);
  }
  return logger;
};
