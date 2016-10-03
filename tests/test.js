var assert = require('assert');
var _ = require('highland');

var find = require('../index.js');

describe('findJSONObjects', function () {

    describe('when given newline-separated JSON objects', function () {

        it('should emit one buffer per object', function (done) {
            _([
                new Buffer('{"foo":"bar"}\n'),
                new Buffer('{"ba'),
                new Buffer('z":"whoop"}\n'),
            ]).consume(find()).toArray(
                function (result) {
                    assert.equal(result.length, 2, 'found two objects');
                    assert.equal(
                        result[0].toString(),
                        '{"foo":"bar"}'
                    );
                    assert.equal(
                        result[1].toString(),
                        '{"baz":"whoop"}'
                    );
                    done();
                }
            );
        });

        it('handles nested objects', function (done) {
            _([
                new Buffer('{"foo":{'),
                new Buffer('"baz":"whoop"'),
                new Buffer('}}'),
            ]).consume(find()).toArray(
                function (result) {
                    assert.equal(result.length, 1, 'found one object');
                    assert.equal(
                        result[0].toString(),
                        '{"foo":{"baz":"whoop"}}'
                    );
                    done();
                }
            );
        });

        it('handles strings containing braces', function (done) {
            _([
                new Buffer('{"whoops":":}"}'),
                new Buffer('{"whoops":"\\":}\\""}'),
            ]).consume(find()).toArray(
                function (result) {
                    assert.equal(result.length, 2, 'found two objects');
                    assert.equal(
                        result[0].toString(),
                        '{"whoops":":}"}'
                    );
                    assert.equal(
                        result[1].toString(),
                        '{"whoops":"\\":}\\""}'
                    );
                    done();
                }
            );
        });

    });

    describe('when given an array of JSON objects', function () {

        it('should emit one buffer per object', function (done) {
            _([
                new Buffer('[{"foo":"bar"},'),
                new Buffer('{"ba'),
                new Buffer('z":"whoop"}]'),
            ]).consume(find()).toArray(
                function (result) {
                    assert.equal(result.length, 2, 'found two objects');
                    assert.equal(
                        result[0].toString(),
                        '{"foo":"bar"}'
                    );
                    assert.equal(
                        result[1].toString(),
                        '{"baz":"whoop"}'
                    );
                    done();
                }
            );

        });

        it('handles weird mixed arrays with strings containing braces', function (done) {
            _([
                new Buffer('["{\"hmm\":2}",{"foo":"bar"}]'),
            ]).consume(find()).toArray(
                function (result) {
                    assert.equal(result.length, 1, 'found one object');
                    assert.equal(
                        result[0].toString(),
                        '{"foo":"bar"}'
                    );
                    done();
                }
            );

        });

    });

    describe('when given an object with a list of objects', function () {

        it('should emit one buffer per object', function (done) {
            _([
                new Buffer('{"entri'),
                new Buffer('es":[{'),
                new Buffer('"foo":"baz"},'),
                new Buffer('{"faa":"boz"}]}'),
            ]).consume(find({nestingLevel:1})).toArray(
                function (result) {
                    assert.equal(result.length, 2, 'found two objects');
                    assert.equal(
                        result[0].toString(),
                        '{"foo":"baz"}'
                    );
                    assert.equal(
                        result[1].toString(),
                        '{"faa":"boz"}'
                    );
                    done();
                }
            );

        });
    });

    describe('when given malformed data', function () {

        it('detects an unclosed object', function (done) {
            var errors = [];
            _([
                new Buffer('{"ohdear'),
            ]).consume(find()).errors(function (err, push) {
                errors.push(err);
            }).toArray(
                function (result) {
                    assert.equal(errors.length, 1, 'got one error');
                    assert.equal(
                        errors[0].message,
                        'stream ended inside JSON object'
                    );
                    done();
                }
            );

        });

        it('emits error when object is too big for buffer', function (done) {
            var errors = [];
            _([
                new Buffer('{"really long object":"does not fit tiny buffer"}'),
            ]).consume(find({maxObjectSize:10})).errors(function (err, push) {
                errors.push(err);
            }).toArray(
                function (result) {
                    assert.equal(errors.length, 1, 'got one error');
                    assert.equal(
                        errors[0].message,
                        'JSON object too large'
                    );
                    done();
                }
            );

        });

    });

});
