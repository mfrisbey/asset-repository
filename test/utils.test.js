var assert = require('assert');
var utils = require('../lib/utils');

it('test sep', function () {
  assert(utils.sep());
});

it('test join path', function () {
  assert(utils.joinPath(utils.sep(), 'some', 'path') === (utils.sep() + 'some' + utils.sep() + 'path'));
});

it('test get path name', function () {
  assert(utils.getPathName('test') === 'test');
  assert(utils.getPathName(utils.joinPath(utils.sep(), 'test', 'directory')) === 'directory');
});

it('test get parent path', function () {
  assert(utils.getParentPath('test') === null);
  assert(utils.getParentPath(utils.sep()) === utils.sep());
  assert(utils.getParentPath(utils.joinPath(utils.sep(), 'test', 'directory')) === utils.joinPath(utils.sep(), 'test'));
});

it('test is root', function () {
  assert(utils.isRoot(utils.sep()));
  assert(!utils.isRoot('test'));
});
