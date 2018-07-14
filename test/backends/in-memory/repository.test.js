var assert = require('assert');
var Readable = require('stream').Readable;

var InMemoryRepository = require('../../../lib/backends/in-memory/repository');
var constants = require('../../../lib/constants');

function getRepository() {
  var repository = new InMemoryRepository();
  return repository;
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
  var firstRead = true;
  stream.on('readable', function () {
    if (firstRead) {
      firstRead = false;
      var buffer = [];
      var chunk;
      while (null !== (chunk = stream.read())) {
        buffer.push(chunk);
      }

      callback(Buffer.concat(buffer).toString());
    }
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
  var initialModified = 0;
  repository.createAsset('/test.txt', function (err, stream) {
    assert(!err);
    assert(stream);
    repository.exists('/test.txt', function (err, exists) {
      assert(!err);
      assert(!exists);
      stream.end('hello world!');
    });
  }, function (err, info) {
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
          repository.updateAsset('/test.txt', function (err, stream) {
            assert(!err);
            assert(stream);
            stream.end('goodbye world!');
          }, function (err, info) {
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
    repository.createAsset('/test', function (err, stream) {
      assert(err);
      assert(!stream);
      repository.createAsset('/invalid/test.txt', function (err, stream) {
        assert(err);
        assert(!stream);
        repository.updateAsset('/test', function (err, stream) {
          assert(err);
          assert(!stream);
          repository.createAsset('/test/asset.txt', function (err, stream) {
            assert(!err);
            assert(stream);
            stream.end('test');
          }, function (err) {
            assert(!err);
            repository.list('/test/asset.txt', function (err, list) {
              assert(err);
              assert(!list);
              repository.deleteDirectory('/test/asset.txt', function (err) {
                assert(err);
                repository.createDirectory('/test/asset.txt/test', function (err) {
                  assert(err);
                  repository.createAsset('/test/asset.txt/asset.txt', function (err) {
                    assert(err);
                    repository.deleteAsset('/test', function (err) {
                      assert(err);
                      repository.createAsset('/test/asset.txt', function (err, stream) {
                        assert(err);
                        assert(!stream);
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
    }, function () {
      assert(false, 'final callback should not be called');
    });
  });
});

it('test create asset no callback', function (done) {
  var repository = getRepository();
  repository.createAsset('/test.txt', function (err, stream) {
    assert(!err);
    assert(stream);
    done();
  });
});

it('test update asset no callback', function (done) {
  var repository = getRepository();
  repository.createAsset('/test.txt', function (err, stream) {
    assert(!err);
    assert(stream);
    stream.end('hello');
  }, function (err) {
    assert(!err);
    repository.updateAsset('/test.txt', function (err, stream) {
      assert(!err);
      assert(stream);
      done();
    });
  });
});

it('test update asset info', function (done) {
  var repository = getRepository();
  repository.createAsset('/test.txt', function (err, stream) {
    assert(stream);
    stream.end('hello world!');
  }, function (err, info) {
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
  repository.createAsset('/test.txt', function (err, stream) {
    assert(stream);
    stream.end('hello tests!');
  }, function (err) {
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
  repository.createAsset('/test.txt', function (err, stream) {
    assert(stream);
    stream.end('hello tests!');
  }, function (err) {
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
      repository.createAsset('/test/test.txt', function (err, stream) {
        assert(!err);
        assert(stream);
        stream.end('hello test');
      }, function (err) {
        assert(!err);
        repository.createAsset('/test/atest.txt', function (err, stream) {
          assert(!err);
          assert(stream);
          stream.end('hello test');
        }, function (err) {
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
