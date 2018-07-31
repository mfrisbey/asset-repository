navigator = {
  appVersion: 'Windows'
};

var utils = require('../lib/utils');
var assert = require('assert');

it('test sep', function () {
  assert(utils.sep() === '\\');
  navigator.appVersion = 'Mac';
  assert(utils.sep() === '/');
});
