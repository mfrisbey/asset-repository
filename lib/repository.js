/*
 *  Copyright 2018 Adobe Systems Incorporated. All rights reserved.
 *  This file is licensed to you under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License. You may obtain a copy
 *  of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under
 *  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 *  OF ANY KIND, either express or implied. See the License for the specific language
 *  governing permissions and limitations under the License.
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var uuid = require('uuid/v4');

var constants = require('./constants');
var utils = require('./utils');
var Logger = require('./logger');

var EMIT_DELAY = 1000;
var TRANSFER_TYPE_CREATE = 'create';
var TRANSFER_TYPE_UPDATE = 'update';
var TRANSFER_TYPE_READ = 'read';

/**
 * Base class representing a repository that stores assets. Provides methods for interacting with assets and directories
 * in the repository; examples include creating, updating, retrieving, and deleting assets.
 *
 * Specific implementations should provide functionality for each of the unimplemented methods in this class.
 *
 * Each method accepts an options object, which generally supports the following values:
 * {String} path: Full path to an entity. Required unless specified otherwise.
 * [String|RegExp] searchTerm: Term to use when searching for items. Optional unless specified otherwise.
 * [String] subscriberId: If specified, the ID of the subscriber invoking the method. The method's callback(s) will
 *                        only be invoked if the subscriber is still registered at the time of invocation.
 * @param {Object} options Control how the repository behaves.
 * @constructor
 */
function Repository(options) {
  EventEmitter.call(this);
  this.subscribers = {};
  this.lastEmit = {};
}

util.inherits(Repository, EventEmitter);

/*
 * ---------------------------------------------------------------------------------------------------------------------
 * METHODS TO IMPLEMENT
 * ---------------------------------------------------------------------------------------------------------------------
 * The methods in this section should be implemented when creating a new repository.
 */

/**
 * Should be implemented by child classes to indicate whether or not a given path exists.
 * @param {String} path The path to test.
 * @param {Object} options Options received from the caller.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Boolean} callback.exists True if the path exists, false otherwise.
 * @protected
 */
Repository.prototype._exists = function (path, options, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to retrieve information for a path.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.info Information for an item in the repository.
 * @protected
 */
Repository.prototype._getInfo = function (path, options, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to list all child items of a directory.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Folder info as retrieved with getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Array} callback.list Array of child items. Each entry in the array will be the info of an item in the repository.
 * @protected
 */
Repository.prototype._list = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to create a new directory.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} parentInfo Parent folder's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @protected
 */
Repository.prototype._createDirectory = function (path, options, parentInfo, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to remove a directory.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Folder's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @protected
 */
Repository.prototype._deleteDirectory = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be implemented to retrieve an asset's content.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Asset's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's content.
 * @protected
 */
Repository.prototype._getAsset = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to retrieve an asset's thumbnail.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Asset's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's thumbnail content.
 * @param {String} callback.contentType Mime type of the thumbnail image.
 * @protected
 */
Repository.prototype._getAssetThumbnail = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to retrieve an asset's preview image.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Asset's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's preview content.
 * @param {String} callback.contentType Mime type of the preview image.
 * @protected
 */
Repository.prototype._getAssetPreview = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be retrieve a write stream to an asset.
 * @param {String} path The path of an item.
 * @param {Boolean} isCreate Will be true if the asset should be created.
 * @param {Object} options Options received from the caller.
 * @param {Object} info If isCreate, info for the parent directory as retrieved by getInfo. Otherwise the asset's info as retrieved by getInfo.
 * @param {Function} streamCallback Invoked when a writable stream to the asset's content is available.
 * @param {String} streamCallback.err Truthy if there was an error during the operation.
 * @param {Stream} streamCallback.stream Writable stream to an asset's content. The stream's error event will be handled by the repository, so there is no need for child classes to handle it.
 * @param {Function} finishedCallback Invoked when the entire write operation is complete.
 * @param {String} finishedCallback.err Truthy if there was an error during the operation.
 * @protected
 */
Repository.prototype._getAssetWriteStream = function (path, isCreate, options, info, streamCallback, finishedCallback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to delete an asset.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Asset's info as returned by getInfo.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @protected
 */
Repository.prototype._deleteAsset = function (path, options, info, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to update an existing asset's info.
 * @param {String} path The path of an item.
 * @param {Object} options Options received from the caller.
 * @param {Object} info Asset's info as returned by getInfo.
 * @param {Object} updatedInfo Specified keys will be updated in the asset's info.
 * @param {Function} callback Should be invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @protected
 */
Repository.prototype._updateAssetInfo = function (path, options, info, updatedInfo, callback) {
  callback('not implemented');
};

/**
 * Should be implemented by child classes to search for all assets in the repository that match a specified term.
 * @param {RegExp} searchTerm The term to match items with in the search.
 * @param {Object} options Options received from the caller.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Array} callback.assets List of assets, where each entry is an asset's information.
 */
Repository.prototype._findAssets = function (searchTerm, options, callback) {
  callback('not implemented');
};

/*
 * ---------------------------------------------------------------------------------------------------------------------
 * STATIC METHODS
 * ---------------------------------------------------------------------------------------------------------------------
 * A few helper methods that can be consumed freely.
 */

/**
 * Retrieves the path from an options object.
 * @param {Object} options An object containing options.
 * @returns {String} A path value.
 */
Repository.getPathFromOptions = function (options) {
  return options.path;
};

/**
 * Retrieves the subscriber id from an options object.
 * @param {Object} options An object containing options.
 * @returns {String} A subscriber id value.
 */
Repository.getSubscriberIdFromOptions = function (options) {
  return options.subscriberId;
};

/**
 * Retrieves the search term from an options object.
 * @param {Object} options An object containing options.
 * @returns {RegExp} A search term.
 */
Repository.getSearchTermFromOptions = function (options) {
  return options.searchTerm;
};

/**
 * Retrieves the context id from an options object.
 * @param {Object} options An object containing options.
 * @returns {String} A context id value.
 */
Repository.getContextIdFromOptions = function (options) {
  return options.contextId;
};

/**
 * Retrieves a logger for the given options supplied to a method.
 * @param {Object} options An object containing options.
 * @returns {String} A log label.
 */
Repository.getLogger = function (options) {
  var subscriber = Repository.getSubscriberIdFromOptions(options) || 'no subscriber';
  var contextId = Repository.getContextIdFromOptions(options) || uuid();
  var logLabel = '[' + subscriber + '][' + contextId + ']';
  return Logger.getLogger(logLabel);
};

/*
 * ---------------------------------------------------------------------------------------------------------------------
 * PUBLIC METHODS
 * ---------------------------------------------------------------------------------------------------------------------
 * Public methods for the repository. Shouldn't need to be overridden except in uncommon cases.
 */

/**
 * Indicates that a consumer is subscribed to this repository. The repository's API methods will invoke their
 * callbacks.
 * @param {String} subscriberId Identifier for the subscriber.
 */
Repository.prototype.subscribe = function (subscriberId) {
  this.subscribers[subscriberId] = true;
};

/**
 * Indicates that a consumer is no longer subscribed to this repository. The repository's API methods will no longer
 * invoke callbacks.
 * @param {String} subscriberId Identifier for the subscriber.
 */
Repository.prototype.unsubscribe = function (subscriberId) {
  if (this.isSubscribed(subscriberId)) {
    delete this.subscribers[subscriberId];
  }
};

/**
 * Returns a value indicating whether or not a given subscriber is currently subscribed.
 * @param {String} subscriberId Identifier for the subscriber.
 * @returns {Boolean} True if subscribed, otherwise false.
 */
Repository.prototype.isSubscribed = function (subscriberId) {
  return this.subscribers[subscriberId] ? true : false;
};

/**
 * Takes into account the current subscriber (if provided) and invokes the provided callback if still subscribed.
 * @param {Object} options Uses the subscriber value to check for subscription.
 * @param {Function} callback Invoked if no subscriber provided, or if the specified subcriber is still subscribed.
 */
Repository.prototype.emitCallback = function (options, callback) {
  var subscriberId = Repository.getSubscriberIdFromOptions(options);
  var log = Repository.getLogger(options);

  if ((!subscriberId) || this.isSubscribed(subscriberId)) {
    log.debug('subscriber is valid, emitting callback');
    callback();
  } else {
    log.debug('subscriber is invalid, ignoring callback');
  }
};

/**
 * Determines if a given path (directory or asset) exists in the repository.
 *
 * No expected errors.
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Boolean} callback.exists True if the path exists, false otherwise.
 */
Repository.prototype.exists = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('checking if path exists %s', path);

  this._exists(Repository.getPathFromOptions(options), options, function (err, exists) {
    if (err) {
      log.error('encountered error checking if path exists', path, err);
    }
    self.emitCallback(options, function () {
      callback(err, exists);
    });
  });
};

/**
 * Retrieves the information for a path (directory or asset) in the repository.
 *
 * Expected errors:
 * Path does not exist
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.info Information for an item in the repository.
 */
Repository.prototype.getInfo = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('getting info for path %s', path);

  function _sendCallback(err, info) {
    log.debug('finished retrieving info for path %s', path);
    self.emitCallback(options, function () {
      callback(err, info);
    });
  }

  this.exists(options, function (err, exists) {
    if (err || !exists) {
      if (err) {
        log.error('error while retrieving info for path %s', path, err);
      }
      _sendCallback(!exists ? 'path does not exist ' + path : err);
      return;
    }
    self._getInfo(path, options, _sendCallback);
  });
};

/**
 * Lists all children items (directories and assets) of a directory in the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not a directory
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Array} callback.list Array of child items. Each entry in the array will be the info of an item in the repository.
 */
Repository.prototype.list = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('listing path %s', path);

  function _sendCallback(err, list) {
    log.debug('finished listing path %s', path);
    self.emitCallback(options, function () {
      callback(err, list);
    });
  }

  this.getInfo(options, function (err, info) {
    if (err || info.type !== constants.DIR_TYPE) {
      if (err) {
        log.error('error while listing path %s', path, err);
      }
      _sendCallback(err ? err : 'path to list is not a directory ' + path);
      return;
    }
    self._list(path, options, info, _sendCallback);
  });
};

/**
 * Creates a new directory in the repository.
 *
 * Expected errors:
 * Path already exists
 * Parent does not exist
 * Parent is not a directory
 * Path is root
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.info Information for the new item.
 */
Repository.prototype.createDirectory = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('creating directory %s', path);

  function _sendCallback(err, info) {
    log.debug('finished creating directory %s', path);
    self.emitCallback(options, function () {
      callback(err, info);
    });
  }

  if (utils.isRoot(path)) {
    log.error('attempt to create root directory %s', path);
    _sendCallback('cannot create root directory');
    return;
  }

  this.exists(options, function (err, exists) {
    if (err || exists) {
      if (err) {
        log.error('error creating directory when trying to determine if path exists', path, err);
      }
      _sendCallback(exists ? 'directory to create already exists ' + path : err);
      return;
    }
    var parentOptions = _copyOptions(options);
    parentOptions.path = utils.getParentPath(path);
    self.getInfo(parentOptions, function (err, info) {
      if (err || info.type !== constants.DIR_TYPE) {
        if (err) {
          log.error('error creating directory when retrieving parent info %s', path, err);
        }
        _sendCallback(err ? err : 'cannot create directory ' + path + ' beneath entity type ' + info.type);
        return;
      }
      self._createDirectory(path, options, info, function (err) {
        if (err) {
          log.error('error creating directory %s', path, err);
          _sendCallback(err);
          return;
        }
        self.getInfo(options, _sendCallback);
      });
    });
  });
};

/**
 * Removes a directory from the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not a directory
 * Path is root
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 */
Repository.prototype.deleteDirectory = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('deleting directory %s', path);

  function _sendCallback(err) {
    log.debug('finished deleting directory %s', path);
    self.emitCallback(options, function () {
      callback(err);
    });
  }

  if (utils.isRoot(path)) {
    log.error('attempt to delete root directory %s', path);
    _sendCallback('cannot delete root directory');
    return;
  }

  this.getInfo(options, function (err, info) {
    if (err || info.type !== constants.DIR_TYPE) {
      if (err) {
        log.error('error deleting directory while retrieving info for directory', path, err);
      }
      _sendCallback(err ? err : 'path to delete is not a directory ' + path);
      return;
    }
    self._deleteDirectory(path, options, info, _sendCallback);
  });
};

/**
 * Retrieves an asset's content from the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's content.
 */
Repository.prototype.getAsset = function (pathOrOptions, callback) {
  _getExistingAssetStream.call(this, pathOrOptions, true, this._getAsset, callback);
};

/**
 * Retrieves an asset's thumbnail from the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's thumbnail content.
 * @param {String} callback.contentType Mime type of the thumbnail image.
 */
Repository.prototype.getAssetThumbnail = function (pathOrOptions, callback) {
  _getExistingAssetStream.call(this, pathOrOptions, false, this._getAssetThumbnail, callback);
};

/**
 * Retrieves an asset's preview image from the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Stream} callback.stream Readable stream to an asset's preview content.
 * @param {String} callback.contentType Mime type of the preview image.
 */
Repository.prototype.getAssetPreview = function (pathOrOptions, callback) {
  _getExistingAssetStream.call(this, pathOrOptions, false, this._getAssetPreview, callback);
};

/**
 * Creates a new asset in the repository.
 *
 * Expected errors:
 * Path already exists
 * Parent path does not exist
 * Parent is not a directory
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Stream} readStream Stream read as the asset's content.
 * @param [Function] callback Invoked when the asset is fully created.
 * @param [String] callback.err Truthy if there was an error during the operation.
 * @param [Object] callback.info Information for an asset.
 */
Repository.prototype.createAsset = function (pathOrOptions, readStream, callback) {
  _getWriteStream.call(this, pathOrOptions, true, readStream, callback);
};

/**
 * Updates an existing asset's content in the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Stream} readStream Stream to read as the asset's content.
 * @param [Function] callback Invoked when the asset is fully updated.
 * @param [String] callback.err Truthy if there was an error during the operation.
 * @param [Object] callback.info Information for an asset.
 */
Repository.prototype.updateAsset = function (pathOrOptions, readStream, callback) {
  _getWriteStream.call(this, pathOrOptions, false, readStream, callback);
};

/**
 * Updates an existing asset's information in the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 */
Repository.prototype.deleteAsset = function (pathOrOptions, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('deleting asset %s', path);

  function _sendCallback(err) {
    log.debug('finished deleting asset %s', path);
    self.emitCallback(options, function () {
      callback(err);
    });
  }

  self.getInfo(options, function (err, info) {
    if (err || info.type !== constants.ASSET_TYPE) {
      if (err) {
        log.error('error deleting asset while retrieving asset info %s', path, err);
      }
      _sendCallback(err ? err : 'path to delete is not an asset ' + path);
      return;
    }
    self._deleteAsset(path, options, info, _sendCallback);
  });
};

/**
 * Updates an existing asset's info in the repository.
 *
 * Expected errors:
 * Path does not exist
 * Path is not an asset
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Object} newInfo Specified keys will be updated in the asset's info.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.info Information for an asset.
 */
Repository.prototype.updateAssetInfo = function (pathOrOptions, newInfo, callback) {
  var self = this;

  var options = _convertPathOptionsToObject(pathOrOptions);
  var log = Repository.getLogger(options);
  var path = Repository.getPathFromOptions(options);

  log.debug('updating asset info %s', path);

  function _sendCallback(err, info) {
    log.debug('finished updating asset info %s', path);
    self.emitCallback(options, function () {
      callback(err, info);
    });
  }

  this.getInfo(options, function (err, info) {
    if (err || info.type !== constants.ASSET_TYPE) {
      if (err) {
        log.error('error updating asset info while retrieving asset info %s', path, err);
      }
      _sendCallback(err ? err : 'path to update is not an asset ' + path);
      return;
    }

    var updatedInfo = {};
    for (var key in info) {
      if (newInfo[key] !== undefined) {
        updatedInfo[key] = newInfo[key];
      } else {
        updatedInfo[key] = info[key];
      }
    }

    self._updateAssetInfo(path, options, info, updatedInfo, function (err) {
      if (err) {
        log.error('error updating asset info %s', path, err);
        _sendCallback(err);
        return;
      }
      self.getInfo(options, _sendCallback);
    });
  });
};

/**
 * Searches for all assets in the repository that match a specified search term.
 *
 * No expected errors.
 * @param {String|RegExp|Object} searchTermOrOptions If a string, the term to use in a simple "contains" search. If a RegExp, the term to match items with in the search. If an object,
 *  see class documentation for details. Path option is not required, but searchTerm option is.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Array} callback.assets List of assets, where each entry is an asset's information.
 */
Repository.prototype.findAssets = function (searchTermOrOptions, callback) {
  var self = this;

  var options = _convertSearchTermOptionsToObject(searchTermOrOptions);
  var log = Repository.getLogger(options);
  var searchTerm = Repository.getSearchTermFromOptions(options);

  log.debug('finding assets %s', searchTerm);

  this._findAssets(searchTerm, options, function (err, assets) {
    if (err) {
      log.error('error finding assets %s', searchTerm, err);
    }
    log.debug('finished finding assets %s', searchTerm);

    self.emitCallback(options, function () {
      callback(err, assets);
    });
  });
};
/*
 * ---------------------------------------------------------------------------------------------------------------------
 * PRIVATE METHODS
 * ---------------------------------------------------------------------------------------------------------------------
 * These methods should not be used externally and are not guaranteed to remain unchanged.
 */

/**
 * Creates a shallow copy of options.
 * @param {object} toCopy The options to copy.
 * @return {object} An options object.
 * @private
 */
function _copyOptions(toCopy) {
  var copied = {};
  for (var key in toCopy) {
    copied[key] = toCopy[key];
  }
  return copied;
}

/**
 * Ensures that provided options are an object. If not, converts the value to an object according to the provided parameters.
 * @param {object} options Options object to convert.
 * @param {string} convertAttribute If typeMatchFunc evaluates to true, a new object with an attribute named this will be created.
 * @param {function} typeMatchFunc A function that should return true if the value needs to be converted.
 * @param {object} typeMatchFunc.toCheck The value to check for conversion.
 * @returns {object} A converted options object.
 * @private
 */
function _convertOptionsToObject (options, convertAttribute, typeMatchFunc) {
  if (typeMatchFunc(options)) {
    var convertValue = options;
    options = {};
    options[convertAttribute] = convertValue;
  } else if ((typeof options) !== 'object') {
    // fallback if the value is unrecognized.
    options = {};
  }

  options.contextId = options.contextId || uuid();
  return options;
}

/**
 * Ensures that provided options are an object containing a searchTerm attribute.
 * @param {object} options Options object to convert.
 * @returns {object} A converted options object.
 * @private
 */
function _convertSearchTermOptionsToObject (options) {
  var converted = _convertOptionsToObject(options, 'searchTerm', function (toCheck) {
    return ((typeof toCheck) === 'string') || (toCheck instanceof RegExp);
  });
  var searchTerm = Repository.getSearchTermFromOptions(converted);
  if ((typeof searchTerm === 'string')) {
    converted.searchTerm = new RegExp(searchTerm);
  }
  return converted;
}

/**
 * Ensures that provided options are an object containing a path attribute.
 * @param {object} options Options object to convert.
 * @returns {object} A converted options object.
 * @private
 */
function _convertPathOptionsToObject (options) {
  return _convertOptionsToObject(options, 'path', function (toCheck) {
    return ((typeof toCheck) === 'string');
  });
}

/**
 * Registers events for the given stream and emits the repository's transferprogress event as required.
 * @param {Stream} stream The stream to monitor.
 * @param {Object} options An object containing options.
 * @param {String} transferType Will be sent with the transferprogress event.
 * @param {Object} info Will be sent with the transferprogress event.
 * @param {Function} callback Invoked when there has been an update to the total data read or the transfer rate.
 * @param {Number} callback.totalRead The total number of bytes transferred so far.
 * @param {Number} callback.rate The transfer rate.
 * @private
 */
function _monitorTransferProgress(stream, options, transferType, info, callback) {
  var self = this;
  var path = Repository.getPathFromOptions(options);
  var totalRead = 0;
  var rate = 0;
  var startTime = new Date().getTime();
  stream.on('data', function (chunk) {
    totalRead += chunk.length;

    if (_shouldEmitProgress.call(self, path, transferType)) {
      var elapsed = new Date().getTime() - startTime;

      if (elapsed > 0) {
        rate = Math.round(totalRead / elapsed) || 1; // report at least 1 byte per second
      }
    }

    _emitTransferProgress.call(self, options, transferType, info, {type: transferType, read: totalRead, rate: rate});
    callback(totalRead, rate);
  });
}

/**
 * Retrieves a read stream to an existing asset.
 * @param {String|Object} pathOrOptions If a string, the full path to an item. If options, see class documentation for details.
 * @param {Boolean} monitorProgress If true, the repository will send transferprogress events as the stream is read.
 * @param {Function} getStreamFunc Function to call to do the work of creating the stream.
 * @param {Function} callback Invoked with the stream.
 * @param {String} callback.err Truthy if there were errors.
 * @param {Stream} callback.stream Stream to the existing asset.
 * @param [String] callback.contentType Content type of the asset, if supplied.
 * @private
 */
function _getExistingAssetStream(pathOrOptions, monitorProgress, getStreamFunc, callback) {
  var self = this;
  var options = _convertPathOptionsToObject(pathOrOptions);

  function _sendCallback(err, stream, contentType) {
    self.emitCallback(options, function () {
      callback(err, stream, contentType);
    });
  }

  var path = Repository.getPathFromOptions(options);

  this.getInfo(options, function (err, info) {
    if (err || info.type !== constants.ASSET_TYPE) {
      _sendCallback(err ? err : 'path to retrieve is not an asset ' + path);
      return;
    }
    getStreamFunc.call(self, path, options, info, function (err, stream, contentType) {
      if (monitorProgress) {
        var totalRead = 0;
        var rate = 0;
        _emitTransferProgress.call(self, options, TRANSFER_TYPE_READ, info, {type: TRANSFER_TYPE_READ, read: totalRead, rate: rate}, true);

        _monitorTransferProgress.call(self, stream, options, TRANSFER_TYPE_READ, info, function (progressRead, progressRate) {
          totalRead = progressRead;
          rate = progressRate;
        });

        stream.on('end', function () {
          _emitTransferProgress.call(self, options, TRANSFER_TYPE_READ, info, {type: TRANSFER_TYPE_READ, read: totalRead, rate: rate}, true, true);
        });
      }

      _sendCallback(err, stream, contentType);
    });
  });
}

/**
 * Creates a write stream to a new or existing asset.
 * @param {String|Object} pathOrOptions A string or object containing options.
 * @param {Boolean} isCreate True if the stream should be to a new asset, otherwise the stream should be to an existing asset.
 * @param {Stream} readStream Read stream to the asset's content.
 * @param {Function} callback Invoked when writing is complete and the asset has been created/updated.
 * @param {String} callback.err Truthy if there were errors creating/updating the asset.
 * @private
 */
function _getWriteStream(pathOrOptions, isCreate, readStream, callback) {
  var self = this;
  var options = _convertPathOptionsToObject(pathOrOptions);
  var path = Repository.getPathFromOptions(options);
  var callbackSent = false;
  var transferType = isCreate ? TRANSFER_TYPE_CREATE : TRANSFER_TYPE_UPDATE;
  var rate = 0;
  var totalRead = 0;

  function _sendCallback(err, info) {
    if (callback && !callbackSent) {
      callbackSent = true;
      self.emitCallback(options, function () {
        callback(err, info);
      });
    }
  }

  function _validate(callback) {
    if (isCreate) {
      // verify that path does not already exist
      self.exists(options, function (err, exists) {
        if (err || exists) {
          callback(err ? err : 'asset to create already exists ' + path);
          return;
        }

        // verify that parent exists and is a directory
        var parentOptions = _copyOptions(options);
        parentOptions.path = utils.getParentPath(path);
        self.getInfo(parentOptions, function (err, info) {
          if (err || info.type !== constants.DIR_TYPE) {
            callback(err ? err : 'cannot create asset ' + path + ' beneath entity type ' + info.type);
            return;
          }
          // everything is ok to create
          callback(undefined, info);
        });
      });
    } else {
      // verify that path exists and is an asset
      self.getInfo(options, function (err, info) {
        if (err || info.type !== constants.ASSET_TYPE) {
          callback(err ? err : 'path to update is not an asset ' + path);
          return;
        }
        // everything is ok
        callback(undefined, info);
      });
    }
  }

  _validate(function (err, info) {
    if (err) {
      _sendCallback(err);
      return;
    }
    var progressInfo = !isCreate ? info : {name: utils.getPathName(path), type: constants.ASSET_TYPE};
    self._getAssetWriteStream(path, isCreate, options, info, function (err, writeStream) {
      if (err) {
        _sendCallback(err);
        return;
      }
      _emitTransferProgress.call(self, options, transferType, progressInfo, {type: transferType, read: 0, rate: rate}, true, false);
      writeStream.on('error', function (err) {
        _sendCallback(err);
      });
      readStream.on('error', function (err) {
        _sendCallback(err);
      });
      _monitorTransferProgress.call(self, readStream, options, transferType, progressInfo, function (progressRead, progressRate) {
        totalRead = progressRead;
        rate = progressRate;
      });

      readStream.pipe(writeStream);
    }, function (err) {
      if (err) {
        _sendCallback(err);
        return;
      }
      _emitTransferProgress.call(self, options, transferType, progressInfo, {type: transferType, read: totalRead, rate: rate}, true, true);
      if (callback) {
        self.getInfo(options, _sendCallback);
      }
    });
  });
}

/**
 * Returns a value indicating whether or not the transferprogress event should be sent.
 * @param {String} path Full path to an asset.
 * @param {String} transferType Type of transfer.
 * @param [Object] progressData If specified, the event will only be sent if the progress data is different.
 * @returns {boolean} True if the event should be sent, false otherwise.
 * @private
 */
function _shouldEmitProgress(path, transferType, force, progressData) {
  progressData = progressData || {};
  var key = path + ':' + transferType;
  var lastEmit = this.lastEmit[key];
  var isDifferent = true;
  if (lastEmit) {
    isDifferent = (lastEmit.progress.read !== progressData.read || lastEmit.progress.rate !== progressData.rate);
    lastEmit = lastEmit.timestamp;
  }
  var now = new Date().getTime();
  return (isDifferent && (!lastEmit || now - lastEmit > EMIT_DELAY || force));
}

/**
 * Emits the repository's 'transferprogress' event, if the event has not been sent in EMIT_DELAY milliseconds for
 * the given path/transferType combination.
 * @param {String|Object} options An object containing options.
 * @param {String} transferType Type of transfer. Will be sent with the event.
 * @param {Object} info The asset's information. Will be sent with the event.
 * @param {Object} progress Progress information to send with the event.
 * @param [Boolean] force If true, the event will be sent regardless of EMIT_DELAY.
 * @param [Boolean] reset If true, the path/transferType delay will be cleared.
 * @private
 */
function _emitTransferProgress(options, transferType, info, progress, force, reset) {
  var self = this;
  var path = Repository.getPathFromOptions(options);
  var now = new Date().getTime();
  var key = path + ':' + transferType;

  if (_shouldEmitProgress.call(this, path, transferType, force, progress)) {
    this.emitCallback(options, function () {
      self.emit('transferprogress', {path: path, info: info, progress: progress});
    });
    this.lastEmit[key] = {timestamp: now, progress: progress};
  }
  if (reset) {
    if (this.lastEmit[key] !== undefined) {
      delete this.lastEmit[key];
    }
  }
}

module.exports = Repository;
