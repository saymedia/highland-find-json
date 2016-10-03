
var _ = require('highland');

function findJSONObjects(opts) {
    opts = opts || {};
    var nestingLevel = (opts.nestingLevel || 0) + 1;
    var maxObjectSize = opts.maxObjectSize || (8 * 1024);

    var openBraces = 0;
    var inString = false;
    var escaping = false;
    var buf;
    var writePos;

    function newBuffer() {
        buf = new Buffer(maxObjectSize);
        writePos = 0;
    }

    newBuffer();

    return function consume(err, chunk, push, next) {
        if (err) {
            push(err);
            next();
            return;
        }

        if (chunk == _.nil) {
            if (openBraces >= nestingLevel) {
                // We've ended with an object still open, so the stream
                // must contain a JSON syntax error.
                push(new Error('stream ended inside JSON object'));
            }
            push(null, _.nil);
            return;
        }

        var openPos = 0;
        var len = chunk.length;
        for (var pos = 0; pos < len; pos++) {
            var octet = chunk[pos];

            if (octet == 0x22) { // quote
                if (inString && ! escaping) {
                    inString = false;
                }
                else {
                    inString = true;
                }
            }
            escaping = false;

            if (inString) {
                if (octet == 0x5c) { // backslash
                    escaping = true;
                }

                continue;
            }

            if (octet == 0x7b) { // opening brace
                openBraces++;

                if (openBraces == nestingLevel) {
                    // Beginning of an interesting object
                    openPos = pos;
                }
            }
            else if (octet == 0x7d) { // closing brace
                openBraces--;

                if (openBraces == (nestingLevel - 1)) {
                    // End of an interesting object

                    // Copy everything up to this point into our result buffer
                    writePos += chunk.copy(buf, writePos, openPos, pos + 1);
                    if (writePos == buf.length) {
                        push(new Error('JSON object too large'));
                    }
                    else {
                        var slice = buf.slice(0, writePos);
                        push(null, slice);
                    }
                    newBuffer();
                }
            }
        }
        if (openBraces >= nestingLevel) {
            // We're ending this chunk an object, so copy everything we found
            // so far into the result buffer so we can resume the object
            // when the next chunk shows up.
            writePos += chunk.copy(buf, writePos, openPos);
        }
        next();
    };
}

module.exports = findJSONObjects;
