var assert = require('assert');
var MemoryStream = require('memorystream');

var InMemoryRepository = require('../../../lib/backends/in-memory/repository');
var constants = require('../../../lib/constants');

function getRepository() {
  var repository = new InMemoryRepository();
  return repository;
}

function getReadStream(content, options) {
  options = options || {};
  options.readable = true;
  options.writable = false;
  return new MemoryStream(content, options);
}

it('test directory', function (done) {
  var repository = getRepository();
  repository.createDirectory('/test', function (err, info) {
    assert(!err);
    assert(info);
    repository.exists('/test', function (err, exists) {
      assert(!err);
      assert(exists);
      repository.list('/', function (err, list) {
        assert(!err);
        assert(list.length === 1);
        assert(list[0].name === 'test');
        assert(list[0].type === constants.DIR_TYPE);
        assert(list[0].created);
        repository.list('/test', function (err, list) {
          assert(!err);
          assert(list.length === 0);
          repository.getInfo('/test', function (err, info) {
            assert(!err);
            assert(info);
            assert(info.name === 'test');
            assert(info.created);
            assert(info.type === constants.DIR_TYPE);
            repository.deleteDirectory('/test', function (err) {
              assert(!err);
              repository.exists('/test', function (err, exists) {
                assert(!err);
                assert(!exists);
                done();
              });
            });
          });
        });
      });
    });
  });
});

it('test directory errors', function (done) {
  var repository = getRepository();
  repository.createDirectory('/', function (err) {
    assert(err);
    repository.deleteDirectory('/', function (err) {
      assert(err);
      repository.deleteDirectory('/invalid', function (err) {
        assert(err);
        repository.createDirectory('/invalid/path', function (err) {
          assert(err);
          repository.exists('/noexist', function (err, exists) {
            assert(!err);
            assert(!exists);
            repository.exists('/noexist/sub', function (err, exists) {
              assert(!err);
              assert(!exists);
              repository.list('/invalid', function (err, list) {
                assert(err);
                assert(!list);
                repository.createDirectory('/duplicate', function (err) {
                  assert(!err);
                  repository.createDirectory('/duplicate', function (err) {
                    assert(err);
                    repository.getInfo('/invalid', function (err, info) {
                      assert(err);
                      assert(!info);
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

function readToEnd(stream, callback) {
  var buffer = [];
  stream.on('data', function (chunk) {
    buffer.push(chunk);
  });
  stream.on('end', function () {
    callback(Buffer.concat(buffer).toString());
  });
}

function verifyAssetContent(repository, path, expected, callback) {
  repository.getAsset(path, function (err, stream) {
    assert(!err);
    assert(stream);
    readToEnd(stream, function (data) {
      assert(data === expected);
      callback();
    });
  });
}

it('test asset', function (done) {
  var repository = getRepository();
  var stream = getReadStream('hello world!');
  repository.createAsset('/test.txt', stream, function (err, info) {
    assert(!err);
    assert(info);
    assert(info.size === 12);
    repository.getInfo('/test.txt', function (err, info) {
      assert(!err);
      assert(info);
      repository.list('/', function (err, list) {
        assert(!err);
        assert(list.length === 1);
        assert(list[0].name === 'test.txt');
        assert(info.created);
        assert(info.modified);
        assert(info.type === constants.ASSET_TYPE);
        assert(info.contentType === 'text/plain');
        assert(info.size === 12);
        assert(!info.checkedOut);
        assert(!info.checkedOutBy);
        verifyAssetContent(repository, '/test.txt', 'hello world!', function () {
          stream = getReadStream('goodbye world!');
          repository.updateAsset('/test.txt', stream, function (err, info) {
            assert(!err);
            assert(info);
            verifyAssetContent(repository, '/test.txt', 'goodbye world!', function () {
              repository.getInfo('/test.txt', function (err, info) {
                assert(!err);
                assert(info);
                repository.deleteAsset('/test.txt', function (err) {
                  assert(!err);
                  repository.exists('/test.txt', function (err, exists) {
                    assert(!err);
                    assert(!exists);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

it('test asset errors', function (done) {
  var repository = getRepository();
  repository.createDirectory('/test', function (err) {
    assert(!err);
    var stream = getReadStream('test');
    repository.createAsset('/test', stream, function (err) {
      assert(err);
      repository.createAsset('/invalid/test.txt', stream, function (err) {
        assert(err);
        repository.updateAsset('/test', stream, function (err) {
          assert(err);
          repository.createAsset('/test/asset.txt', stream, function (err) {
            assert(!err);
            repository.list('/test/asset.txt', function (err, list) {
              assert(err);
              assert(!list);
              repository.deleteDirectory('/test/asset.txt', function (err) {
                assert(err);
                repository.createDirectory('/test/asset.txt/test', function (err) {
                  assert(err);
                  repository.createAsset('/test/asset.txt/asset.txt', stream, function (err) {
                    assert(err);
                    repository.deleteAsset('/test', function (err) {
                      assert(err);
                      repository.createAsset('/test/asset.txt', stream, function (err) {
                        assert(err);
                        repository.getAsset('/test', function (err, stream) {
                          assert(err);
                          assert(!stream);
                          repository.getAsset('/invalid.txt', function (err, stream) {
                            assert(err);
                            assert(!stream);
                            repository.deleteAsset('/invalid.txt', function (err, stream) {
                              assert(err);
                              assert(!stream);
                              done();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

it('test create asset no callback', function () {
  var repository = getRepository();
  var stream = getReadStream('hello');
  repository.createAsset('/test.txt', stream);
});

it('test update asset no callback', function (done) {
  var repository = getRepository();
  var stream = getReadStream('hello');
  repository.createAsset('/test.txt', stream, function (err) {
    assert(!err);
    stream = getReadStream('hello world!');
    repository.updateAsset('/test.txt', stream);
    done();
  });
});

it('test update asset info', function (done) {
  var repository = getRepository();
  var stream = getReadStream('hello world!');
  repository.createAsset('/test.txt', stream, function (err, info) {
    assert(!err);
    assert(!info.checkedOut);
    assert(!info.checkedOutBy);
    repository.updateAssetInfo('/test.txt', {checkedOut: true, checkedOutBy: 'unittest'}, function (err, info) {
      assert(!err);
      assert(info.checkedOut);
      assert(info.checkedOutBy === 'unittest');
      done();
    });
  });
});

it('test update asset info errors', function (done) {
  var repository = getRepository();
  repository.updateAssetInfo('/invalid.txt', {checkedOut: true}, function (err, info) {
    assert(err);
    assert(!info);
    repository.updateAssetInfo('/', {checkedOut: true}, function (err, info) {
      assert(err);
      assert(!info);
      done();
    });
  });
});

it('test get asset thumbnail', function (done) {
  var repository = getRepository();
  var stream = getReadStream('hello tests!');
  repository.createAsset('/test.txt', stream, function (err) {
    assert(!err);
    repository.getAssetThumbnail('/test.txt', function (err, stream, contentType) {
      assert(!err);
      assert(stream);
      assert(contentType === 'text/plain');
      done();
    });
  });
});

it('test get asset thumbnail errors', function (done) {
  var repository = getRepository();
  repository.getAssetThumbnail('/invalid.txt', function (err, stream, contentType) {
    assert(err);
    assert(!stream);
    assert(!contentType);
    repository.getAssetThumbnail('/', function (err, stream) {
      assert(err);
      assert(!stream);
      done();
    });
  });
});

it('test get asset preview', function (done) {
  var repository = getRepository();
  var stream = getReadStream('hello tests!');
  repository.createAsset('/test.txt', stream, function (err) {
    assert(!err);
    repository.getAssetPreview('/test.txt', function (err, stream, contentType) {
      assert(!err);
      assert(stream);
      assert(contentType === 'text/plain');
      done();
    });
  });
});

it('test get asset preview errors', function (done) {
  var repository = getRepository();
  repository.getAssetPreview('/invalid.txt', function (err, stream, contentType) {
    assert(err);
    assert(!stream);
    assert(!contentType);
    repository.getAssetPreview('/', function (err, stream) {
      assert(err);
      assert(!stream);
      done();
    });
  });
});

it('test find assets', function (done) {
  var repository = getRepository();
  repository.findAssets('test', function (err, matches) {
    assert(!err);
    assert(matches);
    assert(matches.length === 0);
    repository.createDirectory('/test', function (err) {
      assert(!err);
      var stream = getReadStream('hello test');
      repository.createAsset('/test/test.txt', stream, function (err) {
        assert(!err);
        stream = getReadStream('hello test');
        repository.createAsset('/test/atest.txt', stream, function (err) {
          assert(!err);
          repository.findAssets(/^test.txt$/g, function (err, matches) {
            assert(!err);
            assert(matches);
            assert(matches.length === 1);
            assert(matches[0].name === 'test.txt');
            repository.findAssets(/test/g, function (err, matches) {
              assert(!err);
              assert(matches);
              assert(matches.length === 2);

              for (var i = 0; i < matches.length; i++) {
                assert(matches[i].type === constants.ASSET_TYPE);
              }
              repository.findAssets('test', function (err, matches) {
                assert(!err);
                assert(matches);
                assert(matches.length === 2);
                done();
              });
            });
          });
        });
      });
    });
  });
});

it('test subscriber', function (done) {
  var repository = getRepository();
  var subscriberId = '12345';
  repository.list({path: '/', subscriberId}, function () {
    assert(false, 'non-subscriber should not receive callback');
  });

  // allow time for previous operation to finish
  setTimeout(function () {
    assert(!repository.isSubscribed(subscriberId));
    repository.subscribe(subscriberId);
    assert(repository.isSubscribed(subscriberId));
    repository.list({path: '/', subscriberId}, function (err, list) {
      assert(!err);
      assert(list);
      repository.unsubscribe(subscriberId);
      assert(!repository.isSubscribed(subscriberId));
      done();
    });
  }, 1000);
});

function _verifyProgressEvent(progress, path, type, name, read, rate) {
  assert(progress.path === path);
  assert(progress.info);
  assert(progress.info.name === name);
  assert(progress.info.type === 'asset');
  assert(progress.progress);
  assert(progress.progress.type === type);
  assert(progress.progress.read === read);
  if (rate) {
    assert(progress.progress.rate > 0);
  } else {
    assert(progress.progress.rate === 0);
  }
}

it('test create progress', function (done) {

  var repository = getRepository();
  var stream = getReadStream('progress test');
  var progressCalls = [];
  repository.on('transferprogress', function (progress) {
    progressCalls.push(progress);
  });
  repository.createAsset('/newasset.txt', stream, function (err) {
    assert(!err);
    assert(progressCalls.length === 2);
    _verifyProgressEvent(progressCalls[0], '/newasset.txt', 'create', 'newasset.txt', 0);
    _verifyProgressEvent(progressCalls[1], '/newasset.txt', 'create', 'newasset.txt', 13);
    done();
  });
});

it('test update progress', function (done) {
  var repository = getRepository();
  var stream = getReadStream('progress test');
  repository.createAsset('/newprogressasset.txt', stream, function (err) {
    assert(!err);
    stream = getReadStream('updated progress text');
    var progressCalls = [];
    repository.on('transferprogress', function (progress) {
      progressCalls.push(progress);
    });
    repository.updateAsset('/newprogressasset.txt', stream, function (err) {
      assert(!err);
      assert(progressCalls.length === 2);
      _verifyProgressEvent(progressCalls[0], '/newprogressasset.txt', 'update', 'newprogressasset.txt', 0);
      _verifyProgressEvent(progressCalls[1], '/newprogressasset.txt', 'update', 'newprogressasset.txt', 21);
      done();
    });
  });
});

it('test read progress', function (done) {
  var repository = getRepository();
  var stream = getReadStream('read test');
  repository.createAsset('/readprogresstest.txt', stream, function (err) {
    assert(!err);
    var progressCalls = [];
    repository.on('transferprogress', function (progress) {
      progressCalls.push(progress);
    });
    repository.getAsset('/readprogresstest.txt', function (err, stream) {
      assert(!err);
      assert(stream);
      stream.on('end', function () {
        assert(progressCalls.length === 2);
        _verifyProgressEvent(progressCalls[0], '/readprogresstest.txt', 'read', 'readprogresstest.txt', 0);
        _verifyProgressEvent(progressCalls[1], '/readprogresstest.txt', 'read', 'readprogresstest.txt', 9);
        done();
      });
    });
  });
});

it('test intermediate progress', function (done) {
  var repository = getRepository();
  var stream = getReadStream('frequency test', {frequence: 1300});
  var progressCalls = [];
  repository.on('transferprogress', function (progress) {
    progressCalls.push(progress);
  });
  repository.createAsset('/frequencytest.txt', stream, function (err) {
    assert(!err);
    assert(progressCalls.length === 2);
    _verifyProgressEvent(progressCalls[0], '/frequencytest.txt', 'create', 'frequencytest.txt', 0);
    _verifyProgressEvent(progressCalls[1], '/frequencytest.txt', 'create', 'frequencytest.txt', 14, true);
    done();
  });
}).timeout(5000);

it('test read no progress', function (done) {
  var repository = getRepository();
  var stream = getReadStream('no read please');
  repository.createAsset('/noreadtest.txt', stream, function (err) {
    assert(!err);
    repository.on('transferprogress', function () {
      assert(false);
    });
    repository.getAssetThumbnail('/noreadtest.txt', function (err) {
      assert(!err);
      repository.getAssetPreview('/noreadtest.txt', function (err) {
        assert(!err);
        done();
      });
    });
  });
});
