var winston = require('winston');
var createLogger = winston.createLogger;
var format = winston.format;
var transports = winston.transports;

var combine = format.combine;
var timestamp = format.timestamp;
var printf = format.printf;
var splat = format.splat;
var simple = format.simple;

var enabled = process.env.ENABLE_ASSET_REPOSITORY_LOGGING;
var level = process.env.LOG_LEVEL || 'info';

const logFormat = printf(info => {
  return info.timestamp + ' ' + info.level + ': ' + info.message;
});

/**
 * Defines a logger that will log to console by default. See setTransports to change this behavior.
 * @constructor
 */
function Logger() {
  this.transports = [
    new transports.Console({
      level: level,
      timestamp: function () {
        return (new Date()).toISOString();
      }
    })
  ];
  this.logger = null;
}

/**
 * Retrieves a logger configured to include a specified label with all its messages.
 * @param [String] labelText If specified, will be included in the message text of all messages from this logger.
 * @returns {LogWrapper} Object to use for logging messages.
 */
Logger.prototype.getLogger = function (labelText) {
  if (!this.logger) {
    this.logger = createLogger({
      format: combine(
        splat(),
        simple(),
        timestamp(),
        logFormat),
      transports: this.transports
    });
  }

  return new LogWrapper(this.logger, labelText);
};

/**
 * Specifies the transports to use when logging messages.
 * @param {Array} transports Transports as supported by the 'winston' module.
 */
Logger.prototype.setTransports = function (transports) {
  this.transports = transports;
};

/**
 * A class for logging messages.
 * @param {winston.Logger} logger The winston logger to use when actually logging messages.
 * @param {String} label Value to include with all messages from this logger.
 * @constructor
 */
function LogWrapper(logger, label) {
  this.logger = logger;
  this.label = label || 'default';
}

/**
 * Does the work of logging a message, including adding the label and only logging if configured to do so.
 * @param {Function} method The log method to invoke.
 * @param {Array} arguments Arguments making up the log messages.
 * @private
 */
function _logMessage(method, arguments) {
  if (enabled) {
    if (arguments.length > 0) {
      arguments[0] = '[' + this.label + '] ' + arguments[0];
    }
    method.apply(this.logger, arguments);
  }
}

/**
 * Logs a message that will only appear at the debug level.
 */
LogWrapper.prototype.debug = function () {
  _logMessage.call(this, this.logger.debug, arguments);
};

/**
 * Logs a message that will only appear at the info level or lower.
 */
LogWrapper.prototype.info = function () {
  _logMessage.call(this, this.logger.info, arguments);
};

/**
 * Logs a message that will only appear at the warn level or lower.
 */
LogWrapper.prototype.warn = function () {
  _logMessage.call(this, this.logger.warn, arguments);
};

/**
 * Logs a message that will only appear at the error level or lower.
 */
LogWrapper.prototype.error = function () {
  _logMessage.call(this, this.logger.error, arguments);
};

module.exports = new Logger();
