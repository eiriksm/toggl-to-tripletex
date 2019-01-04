module.exports = function logger() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(new Date() + ' ');
  // 3. Pass along arguments to console.log
  console.log.apply(console, args);
}