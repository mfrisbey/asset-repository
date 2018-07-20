# Asset Repository

Specifies an API and provides common functionality for interacting with assets in a repository based on directories 
containing assets. The API provides a means of doing the following:

* Creating, removing, and updating assets
* Creating, removing, and listing directories
* Finding assets that match a given search pattern
* Retrieving raw asset binaries and thumbnail/preview renditions

## Getting Started

The asset repository on its own does not provide an implementation. It simply serves as a base class for any kind of 
repository type. It does provide some limited implementations as examples; please see `/lib/backends` to see what's
available.

To implement your own repository, do the following:

* Create a new node module for your repository
* Add `asset-repository` as a dependency (i.e. `npm install --save https://github.com/mfrisbey/asset-repository.git#<target version>`)
* Import the `Repository` class into the file that will be implementing the required methods 
(i.e. `var Repository = require('asset-repository').Repository`)
* Implement the methods noted in the `Repository` class located at `/lib/repository.js`

## Subscribers

The repository employs the concept of a subscriber, which means it will only send its callbacks and events if a 
consuming entity (the "subscriber") is still interested in the result when it's ready. This can be especially useful for
cases in which a consumer has requested a large asset, but has changed its state between the time the asset was 
requested and the time it's finished.

As an example, assume that the consumer of the repository is a React component. When the component mounts, it registers
itself as a subscriber to the repository and then creates an asset. Before the asset is ready, the 
component unmounts (due to some kind of user interaction) and unregisters itself as a subscriber. When the asset
is created, the repository notes that the component is no longer subscribed and does not invoke its callback indicating
that the asset is ready.

The React component's code for this scenario could be as follows:

```
const subscriberId = 'arbitrary component subscription';
constructor(props) {
  super(props);
  this.repository = new InMemoryRepository();
  this.repository.on('transferprogress', this.updateProgress);
}

updateProgress({type, info, progress}) {
  // if the component is unmounted before the asset is full transferred, then this method will not be
  // called because the repository will discontinue sending its 'transferprogress' event to this component
  this.setState({
    type,
    info,
    progress
  });
}

componentWillMount() {
  const self = this;
  this.repository.subscribe(subscriberId);
  this.repository.createAsset(
    {path: '/testasset.jpg', subscriberId}, // note the subscriber id being passed to the repository method
    fs.createReadStream('~/testasset.jpg'), 
    (err, info) => {
      // if the component has unmounted before the asset is fully uploaded, then this callback will never
      // be called
      self.setState({assetReady: true});
    }
  );
}

componentWillUnmount() {
  this.repository.unsubscribe(subscriberId);
}

```

## Exports

The module provides several exports for consumption by external entities:

* `Repository`: Base class that specific repositories should implement.
* `InMemoryRepository`: Sample implementation that simply stores the asset structure in memory.
* `Constants`: Provides various static values used throughout the repository.
* `Utils`: A collection of convenience methods for working with the repository.
* `Logging`: Access into the module's logging capabilities. Please see the Logging section for more details.

## Events

The repository is an event emitter and provides these events:

* **transferprogress**: Sent when the repository has made progress transferring an asset from one stream to another. This
is sent primarily by methods that involve reading an asset's content, including `getAsset`, `createAsset`, and 
`updateAsset`.
  * _{object} eventData_: provided as an argument for the event.
    * _{string} path_: Full path of the asset currently transferring
    * _{object} info_: Information for the asset as retrieved by `getInfo`
    * _{object} progress_: Current progress information for the transfer.
      * _{string} type_: The kind of transfer, which could be one of `update`, `create`, or `read`
      * _{number} read_: The total number of bytes transferred so far.
      * _{number} rate_: The rate at which the asset is transferring, in bytes per millisecond.

## Running Tests

The module uses `mocha` to run its unit tests. To run the tests, first execute `npm install`, then execute `npm test`
from the module's root directory.

## Logging

The module provides log messages that can be enabled for debug purposes. To enable the messages, set the 
`ENABLE_ASSET_REPOSITORY_LOGGING` environment variable to a "truthy" value. For example, from the command line run:

`ENABLE_ASSET_REPOSITORY_LOGGING=1 node <your app>`

To change the detail level of the logging, use the `LOG_LEVEL` environment variable. Valid levels are `debug`, `info`,
`warn`, and `error`. From the command line:

`ENABLE_ASSET_REPOSITORY_LOGGING=1 LOG_LEVEL=debug node <your app>`

### Log Transports

By default, the module's log messages will all be logged to the console. To change this behavior, use the `Logging`
export's `setTransports` method. This method takes an array of `winston` transports; please see `winston`'s documentation
for more details.

### Consuming the Logger

To use the module's logger from a different module, import the `Logger` export and use its methods when writing log
messages. Here is some example code:

```

var Logger = require('asset-repository').Logger;
var log = Logger.getLogger('logging_demo');

log.info('Hello %s World!', 'AssetRepository');

```

This code snippet will generate a message similar to the following to the console:

`2018-07-19T22:13:02.485Z info: [logging_demo] Hello AssetRepository World!`
