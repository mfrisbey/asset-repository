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

var util = require('util');
var async = require('async');
var MemoryStream = require('memorystream');
var mime = require('mime');

var Repository = require('../../repository');
var utils = require('../../utils');
var constants = require('../../constants');

/**
 * Implementation of a Repository that uses an in-memory object for storage.
 * @param [Object] options Controls how the repository behaves.
 * @param [Number] options.delay If specified, indicates how long (in seconds) the repository should pause before
 *   returning results.
 * @constructor
 */
function InMemoryRepository(options) {
  Repository.call(this);

  options = options || {};
  this.repository = _getDirectoryInfo(utils.sep());
  this.delay = options.delay || 0;
  this.userId = options.userId || '';
}

util.inherits(InMemoryRepository, Repository);

/**
 * Delays by the configured delay (if specified) before invoking the provided callback.
 * @param {Function} callback Will be invoked after a delay.
 * @private
 */
function _doDelay(callback) {
  var self = this;
  if (this.delay) {
    setTimeout(callback, this.delay);
  } else {
    // no delay specified - return immediately
    process.nextTick(callback);
  }
}

/**
 * Creates a new object representing a directory.
 * @param {String} path Value to use as the object's name.
 * @returns {Object} Directory information.
 * @private
 */
function _getDirectoryInfo(path) {
  return {
    name: utils.getPathName(path),
    type: constants.DIR_TYPE,
    children: {},
    created: new Date().getTime()
  };
}

/**
 * Creates a new object representing an asset.
 * @param {String} path Value to use as the object's name.
 * @returns {Object} Asset information.
 * @private
 */
function _getAssetInfo(path) {
  var now = new Date().getTime();
  return {
    name: utils.getPathName(path),
    type: constants.ASSET_TYPE,
    content: null,
    created: now,
    modified: now,
    checkedOut: false,
    checkedOutBy: '',
    updateModified: function() {
      this.modified = new Date().getTime()
    },
    updateContent: function (newContent) {
      this.content = newContent;
    }
  }
}

/**
 * Retrieves an entity from the in-memory store.
 * @param {String} path Full path of an entity.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.entity The raw entity from the store.
 * @private
 */
function _getEntity(path, callback) {
  var self = this;
  if (path === utils.sep()) {
    callback(undefined, self.repository);
    return;
  }

  var paths = new String(path).split(utils.sep());
  var currEntity = this.repository;
  var currName = null;
  var parent = null;

  async.eachSeries(paths, function (name, eachCb) {
    if (!name) {
      eachCb();
      return;
    }

    if (!currEntity.children) {
      eachCb('not found - not an entity that has children');
      return;
    }

    if (!currEntity.children[name]) {
      eachCb('not found');
      return;
    }
    parent = currEntity;
    currName = name;
    currEntity = currEntity.children[name];
    eachCb();
  }, function (err) {
    if (err) {
      callback(err);
      return;
    }
    callback(undefined, currEntity, parent, currName);
  });
}

/**
 * Creates a new entity in the in-memory store.
 * @param {String} path Full path of an entity.
 * @param {Object} entityInfo The raw data to use as the entity's information.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @param {Object} callback.entityInfo The information as provided to the method.
 * @private
 */
function _createEntity(path, entityInfo, callback) {
  var parentPath = utils.getParentPath(path);
  var name = utils.getPathName(path);

  _getEntity.call(this, parentPath, function (err, parent) {
    if (err) {
      callback(err);
      return;
    }

    parent.children[name] = entityInfo;
    callback(undefined, entityInfo);
  });
}

/**
 * Updates an asset's information in the in-memory store.
 * @param {String} path Full path of an asset.
 * @param {Object} info The new info.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @private
 */
function _updateAsset(path, info, callback) {
  _getEntity.call(this, path, function (err, entity, parent, entityName) {
    if (err) {
      callback(err);
      return;
    }

    if (entity.type !== constants.ASSET_TYPE) {
      callback('asset to update is not an asset');
      return;
    }

    for (var key in info) {
      parent.children[entityName][key] = info[key];
    }

    callback();
  });
}

/**
 * Removes an entity from the in-memory store.
 * @param {String} path Full path of an asset.
 * @param {Function} callback Invoked with the result.
 * @param {String} callback.err Truthy if there was an error.
 * @private
 */
function _deleteEntity(path, callback) {
  var self = this;
  _getEntity.call(self, utils.getParentPath(path), function (err, parent) {
    if (err) {
      callback(err);
      return;
    }
    delete parent.children[utils.getPathName(path)];
    callback();
  });
}

function _infoFromEntity(entity) {
  var info = {
    name: entity.name,
    created: entity.created,
    type: entity.type
  };

  if (entity.type === constants.ASSET_TYPE) {
    var size = 0;
    if (entity.content) {
      for (var i = 0; i < entity.content.length; i++) {
        size += entity.content[i].length;
      }
    }
    info.modified = entity.modified;
    info.contentType = mime.getType(entity.name);
    info.size = size || 0;
    info.checkedOut = entity.checkedOut || false;
    info.checkedOutBy = entity.checkedOutBy || '';
  }

  return info;
}

function _getInfo(path, callback) {
  var self = this;
  _getEntity.call(this, path, function (err, entity) {
    if (err) {
      callback(err);
      return;
    }

    callback(undefined, _infoFromEntity(entity));
  });
}

/**
 * Determines if a given path exists in the in-memory store.
 */
InMemoryRepository.prototype._exists = function (path, options, callback) {
  var self = this;
  _getEntity.call(this, path, function (err) {
    _doDelay.call(self, function () {
      callback(undefined, err ? false : true);
    });
  });
};

/**
 * Retrieves the information for a path in the in-memory store.
 */
InMemoryRepository.prototype._getInfo = function (path, options, callback) {
  var self = this;
  _getInfo.call(self, path, function (err, info) {
    _doDelay.call(self, function () {
      if (err) {
        callback(err);
        return;
      }
      callback(undefined, info);
    });
  });
};

/**
 * Lists all children items of a path in the in-memory store.
 */
InMemoryRepository.prototype._list = function (path, options, info, callback) {
  var self = this;
  _getEntity.call(this, path, function (err, entity) {
    if (err) {
      callback(err);
      return;
    }

    if (entity.type !== constants.DIR_TYPE) {
      callback('path to list is not a directory ' + path);
      return;
    }

    var children = [];
    async.eachSeries(entity.children, function (child, eachCb) {
      _getInfo.call(self, utils.joinPath(path, child.name), function (err, info) {
        if (err) {
          eachCb(err);
          return;
        }
        children.push(info);
        eachCb();
      });
    }, function (err) {
      _doDelay.call(self, function () {
        if (err) {
          callback(err);
          return;
        }

        callback(undefined, children);
      });
    });
  });
};

/**
 * Creates a new directory in the in-memory store.
 */
InMemoryRepository.prototype._createDirectory = function (path, options, info, callback) {
  var self = this;
  _createEntity.call(this, path, _getDirectoryInfo(path), function (err) {
    _doDelay.call(self, function () {
      callback(err);
    });
  });
};

/**
 * Removes a directory from the in-memory store.
 */
InMemoryRepository.prototype._deleteDirectory = function (path, options, info, callback) {
  var self = this;
  _doDelay.call(this, function () {
    _deleteEntity.call(self, path, callback);
  });
};

/**
 * Retrieves an asset's content from the in-memory store.
 */
InMemoryRepository.prototype._getAsset = function (path, options, info, callback) {
  var self = this;
  _getEntity.call(self, path, function (err, entity) {
    _doDelay.call(self, function () {
      if (err) {
        callback(err);
        return;
      }

      callback(undefined, new MemoryStream(entity.content, {readable: true, writable: false}));
    });
  });
};

/**
 * Retrieves an asset's thumbnail from the in-memory store.
 */
InMemoryRepository.prototype._getAssetThumbnail = function (path, options, info, callback) {
  this._getAsset(path, options, info, function (err, stream) {
    if (err) {
      callback(err);
      return;
    }
    callback(undefined, stream, mime.getType(path));
  });
};

/**
 * Retrieves an asset's preview from the in-memory store.
 */
InMemoryRepository.prototype._getAssetPreview = function (path, options, info, callback) {
  this._getAssetThumbnail(path, options, info, callback);
};

function _createOrGetEntity(path, isCreate, callback) {
  if (isCreate) {
    _createEntity.call(this, path, _getAssetInfo(path), callback);
  } else {
    _getEntity.call(this, path, callback);
  }
}

/**
 * Creates a new asset in the in-memory store.
 */
InMemoryRepository.prototype._getAssetWriteStream = function (path, isCreate, options, info, streamCallback, finishedCallback) {
  var self = this;
  _doDelay.call(self, function () {
    var stream = new MemoryStream(undefined, {readable: false, writable: true});
    stream.on('finish', function () {
      _createOrGetEntity.call(self, path, isCreate, function (err, entity) {
        if (err) {
          finishedCallback(err);
          return;
        }
        entity.updateContent(stream.queue);
        finishedCallback();
      });
    });

    streamCallback(undefined, stream);
  });
};

/**
 * Updates an existing asset's information in the in-memory store.
 */
InMemoryRepository.prototype._updateAssetInfo = function (path, options, info, newInfo, callback) {
  var self = this;
  _updateAsset.call(self, path, newInfo, function (err) {
    _doDelay.call(self, function () {
      callback(err);
    });
  });
};

/**
 * Deletes an existing asset from the in-memory store.
 */
InMemoryRepository.prototype._deleteAsset = function (path, options, info, callback) {
  var self = this;
  _doDelay.call(this, function () {
    _deleteEntity.call(self, path, callback);
  });
};

/**
 * Searches for all assets in the in-memory store that match a specified search term.
 */
Repository.prototype._findAssets = function (searchTerm, options, callback) {
  var self = this;
  var searchQueue = [this.repository];
  var matches = [];

  async.whilst(function () { return searchQueue.length > 0;}, function (whileCb) {
    var item = searchQueue.pop();

    for (var key in item.children) {
      var currChild = item.children[key];
      if (currChild.type === constants.DIR_TYPE) {
        searchQueue.push(currChild);
      } else {
        if (new String(currChild.name).match(searchTerm)) {
          matches.push(_infoFromEntity(currChild));
        }
      }
    }
    whileCb();
  }, function (err) {
    _doDelay.call(self, function () {
      if (err) {
        callback(err);
        return;
      }

      callback(undefined, matches);
    });
  });
};

module.exports = InMemoryRepository;
