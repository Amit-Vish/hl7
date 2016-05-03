'use strict';

var _ = require('lodash');
var bodyParser = require('body-parser');
var crutch = require('qtort-microservices').crutch;
var defaults = {
    defaultExchange: 'topic://api',
    defaultQueue: 'api-web',
    defaultReturnBody: false,
    defaultTimeout: 30000,
    enableLogAndReplyDebug: false, // cli arg: --enableLogAndReplyDebug (Can be used to debug api messages)
};

crutch(defaults, function(express, logging, microservices, options, Promise, util) {
    var log = logging.getLogger('api-web');

    return Promise
        .try(function() {
            var app = express();
            app.use('/', bodyParser.json());

            app.all(/\/api(\/.*)?/, function onRequest(request, response) {
                if(request.headers['content-type'] && request.headers['content-type'].indexOf('multipart/form-data') > -1) {
                    request.body.data = '';
                    request.on('data', function (data) {
                        request.body.data += data;
                        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                        if (request.body.data.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            request.connection.destroy();
                        }
                    });
                    request.on('end', invokeMicroservices);
                }
                else {
                    invokeMicroservices();
                }

                function invokeMicroservices() {
                    var properties = _.extend(
                        _.pick(request.headers, ['host', 'dnt','authorization']),
                        _.pick(request, ['protocol', 'method', 'path', 'params', 'query', 'url']));
                    var rk = _.trim(request.path, '/').split('/')
                        .concat([request.method.toLowerCase()])
                        .join('.');
                    log.debug('%s %s |request| rk: %s', request.method, request.path, rk);
                    log.trace('%s %s |request| rk: %s, \nproperties:\n', request.method, request.path, rk, properties, '\nbody:\n', request.body);
                    return callMicroservices(rk, request, properties, response);
                }
            });

            var server = app.listen(3000, function() {
                var sa = server.address();
                log.info('Example app listening at http://%s:%s', sa.address, sa.port);
            });
        })
        .then(function() {
            if (options.enableLogAndReplyDebug) {
                return microservices.bind('api.#', function logAndReplyDebug(mc) {
                    log.debug('logAndReplyDebug| rk: %s, \nproperties:\n', mc.routingKey, mc.properties);
                    return {
                        messageContext: _.omit(mc, ['body']),
                        body: mc.deserialize(),
                    };
                });
            }
        });

    function callMicroservices(rk, request, properties, response) {
        return microservices.call(rk, request.body, properties)
        .then(function(mc) {
            var body = mc.properties.contentType === 'application/json' && mc.properties.links && !_.isEmpty(mc.properties.links)
                ? _.extend({}, { _links: transformLinks(mc.properties.links) }, mc.deserialize())
                : mc.body;

            var sc = parseInt(_.get(mc.properties, 'status.code') || _.get(body, 'status.code') || '');
            if (sc >= 400) {
                response = response.status(sc);
            }

            if (sc >= 400) {
                if (log.isTraceEnabled()) {
                    log.trace('%s %s |response| status: %s, rk: %s, \nproperties:\n', request.method, request.path, sc, mc.routingKey, mc.properties, '\nbody:\n', body);
                }
                else {
                    log.debug('%s %s |response| status: %s, rk: %s', request.method, request.path, sc, mc.routingKey);
                }
            }

            return response.type(mc.properties.contentType).send(body);
        })
        .catch(Promise.TimeoutError, function(error) {
            log.warn('%s %s |timeout| rk: %s, error: TimeoutError', request.method, request.path, rk);
            return response.status(504).send({ errorType: 'TimeoutError', errorText: error.toString() });
        })
        .catch(function(error) {
            log.warn('%s %s |timeout| rk: %s, error:', request.method, request.path, rk, error);
            return response.status(500).send({ errorType: 'ServerError', errorText: error.toString() });
        });

    }

    function transformLinks(value) {
        if (_.isArray(value)) {
            return _.map(value, transformLinks);
        }
        else if (value.to) {
            return { href: '/' + value.to.split('.').join('/') };
        }
        else if (_.isPlainObject(value)) {
            return _.mapValues(value, transformLinks);
        }
        else {
            return value;
        }
    }
});
