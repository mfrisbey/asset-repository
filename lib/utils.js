var Path = require('path');

/**
 * Retrieves the path separator appropriate to the current operating system.
 * @returns {string} Path separator.
 */
function sep () {
  if (navigator) {
    var isWin = /Win/.test(navigator.appVersion);
    if (isWin) {
      return '\\';
    } else {
      return '/';
    }
  } else {
    return Path.sep;
  }
}

/**
 * Returns the last segment of a path
 *
 * @param {String} path
 * @return {String} last segment of path
 */
function getPathName(path) {
  var pos = path.lastIndexOf(sep());
  if (pos === -1) {
    return path;
  }
  return path.slice(pos + 1);
}

/**
 * Returns the parent path
 *
 * @param {String} path
 * @return {String} parent path
 */
function getParentPath(path) {
  var pos = path.lastIndexOf(sep());
  if (pos === -1) {
    return null;
  }
  if (pos === 0) {
    return sep();
  }
  return path.slice(0, pos);
}

/**
 * Retrieves a value indicating whether a path is root.
 * @param {String} path
 * @returns {Boolean} True if the path is the root, false otherwise.
 */
function isRoot(path) {
  return path === sep();
}

module.exports.sep = sep;
module.exports.getParentPath = getParentPath;
module.exports.getPathName = getPathName;
module.exports.isRoot = isRoot;
