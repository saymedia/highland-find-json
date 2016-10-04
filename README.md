# highland-find-json

`highland-find-json` is highland-based library for locating JSON objects
in a stream of buffers.

The primary use-case for this library is for dealing with very large
(or infinite) streams containing many relatively-small JSON objects, such
as JSON-based logging.

It expects as input a stream of buffers, such as would occur if receiving
data from a TCP socket. It emits another stream of buffers, but in the
output each buffer exactly frames a JSON object from the input stream.

For example, imagine the following buffers show up in an HTTP response:

* `[{"foo":"`
* `bar"},{"baz`
* `":4}]`

`highland-find-json` would consume the above and produce a stream with
two buffers as follows:

* `{"foo":"bar"}`
* `{"baz":4}`

This library does not actually *parse* the JSON; instead, it counts open
and close braces so it can find object boundaries with minimal overhead.
As long as its input is valid JSON, each of the buffers it emits will
contain a valid JSON object.

## Usage

```js
var fs = require('fs');
var _ = require('highland');
var findJson = require('highland-find-json');

var rawData = fs.createReadStream('some.json');

_(rawData).consume(
    findJson()
).map(
    function (buf) {
        return JSON.parse(buf);
    }
).each(
    function (obj) {
        // ... do whatever you want with obj...
        console.log(obj.someProperty);
    }
);
```

## Installation

As usual:

```
npm install --save highland-find-json
```

## License

Copyright 2016 Say Media, Inc.

This library may be distributed under the terms of the MIT license.
For full details, see [LICENSE](LICENSE).
