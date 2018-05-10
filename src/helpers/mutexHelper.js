module.exports = function(dependencies) {
  if (!dependencies) {
    dependencies = {};
  }

  var mutex = dependencies.mutex;

  return {
    lock: function(key) {
      return mutex.lock(key);
    }
  };
};
