var crutch = require('qtort-microservices').crutch;
var hl7 = require('nodengine-hl7');
var path = require('path');
var fs = require('fs');
var Segment = hl7.Segment


var defaults = {
    defaultExchange: 'topic://services',
    defaultQueue: 'api-hl7',
    id : 'api-sign-patients',
    defaultReturnBody: true,
};

crutch(defaults, function(_, logging, microservices, options, Promise, querystring, util) {
    var Log = logging.getLogger('api-hl7');

    return Promise.all([
        microservices.bind('topic://api/api.api-hl7.get', onMessage),
    ]);


    function onMessage(request, mc) {

        
        var parser = new hl7.Parser();
        var filePath = path.join(__dirname, 'test.hl7');
        fs.readFile(filePath, {encoding: 'utf-8'}, function(error,data){
            if (error) {
                return error;
            }
            var s = new Segment(data);
            return mc.reply(s.parsed);
        })
             
        
    }

});
