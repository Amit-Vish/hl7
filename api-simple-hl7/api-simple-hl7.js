var crutch = require('qtort-microservices').crutch;
var hl7 = require('simple-hl7');
var fs = require('fs');
var path = require('path');
var Client = require('ftp');


var defaults = {
    defaultExchange: 'topic://services',
    defaultQueue: 'api-simple-hl7',
    id : 'api-simple-hl7',
    defaultReturnBody: true,
};

crutch(defaults, function(_, logging, microservices, options, Promise, querystring, util) {
    var Log = logging.getLogger('api-simple-hl7');

    return Promise.all([
        microservices.bind('topic://api/api.api-simple-hl7.get', onMessage),
    ]);


    function onMessage(request, mc) {

        var hlSegments = new hl7.Message(
                    "ELLKAY", //Sending Application
                    "4924",
                    "APRIMA", //Receiving Application
                    "4924",
                    "201603111658", //Date/Time of Message
                    "",
                    ["ORU", "R01"], //Message Type and //Trigger Event
                    "2953601", //Message Control ID
                    "T", //Processing ID
                    "2.3",  //Version ID
                    "",
                    "",
                    "",
                    "UNICODE" //Application Acknowledgment Type
            );
             
             /*Patient Identification*/
            hlSegments.addSegment("PID",
                "1", //Set ID (Patient)
                "19607", 
                "19607", //Patient ID –ExternalId
                "00000008751", //Patient ID –AlternateId
                ["Test","Test"], //Patient name – last, first, middle, Suffix, Prefix
                "", // , Mother’s Maiden, AKA last name, AKA first name
                "20050101", // Date /time of birth
                "F", // Sex
                "",
                "", // Race
                ["","",""], //Patient address – add1, add2, city, state, zip, country
                "", 
                "(719)111-1111",  //Phone no. – Home
                "", // Phone no. – Work
                "", // Language
                "", // Marital status
                "",
                "",
                "", // Social Security number
                "" // Patient death date and time
            );

            hlSegments.addSegment("PV1",
                "",  // Set ID – PV1
                "", // Patient class
                "", // Assigned patient location
                "", 
                "", 
                "", // Attending doctor
                ["1376755876", "Link", "Diane","", "","", "","", "","", "", "U"] , //Attending doctor- External ID, last, first, middle, Suffix, Prefix
                "" // Referring doctor - External ID, last, first, middle, Suffix, Prefix
            );

            hlSegments.addSegment("ORC",
                "RE", //Order Control
                "00000008751", //Placer Order Number
                "92223563", //Filler Order Number
                "", 
                "", 
                "", 
                "", 
                "", 
                "", //Date/Time of Transaction
                "", 
                "", 
                ["1376755876", "Link", "Diane","", "","", "","", "","", "", "U"] //Ordering Provider

            );
            /*Observation Request*/
            hlSegments.addSegment("OBR",
                "1", //Set ID - Observation Request
                "00000008751", //Placer Order Number
                "92223563", //Filler Order Number
                "HCS_274^Horizon 274 (PAN-ETHNIC EXTENDED)", //Universal Service ID
                "", 
                "", 
                "201602260000", //Observation Date/Time
                "", 
                "", 
                "", 
                "", 
                "", 
                "", 
                "201603110000", //Specimen Received Date/Time
                "", 
                ["1376755876", "Link", "Diane","", "","", "","", "","", "", "U"], //Ordering Provider
                "", 
                "00000008751",
                "", 
                "", 
                "", 
                "201603110000", //Results Rpt/Status Chng - Date/Time
                "", 
                "", 
                "F" //Result Status

            );

            /*Observation / Result*/
            hlSegments.addSegment("OBX",
                "1", // Set ID – OBX
                "TX", // Value Type
                ["50001", "3-Beta-Hydroxysteroid Dehydrogenase Type II Deficiency"], //Observation Identifier
                "", 
                "Negative", // Observation Value
                "", // Units
                "", // References Range
                "N", // Abnormal Flags
                "", 
                "", 
                "F", // Observ Result Status
                "", 
                "", 
                "", // Date/Time of the Observation
                "" // Producer's ID

            );

            /*Notes and Comments Segment*/
            hlSegments.addSegment("NTE", 
                "1", 
                "", // Source of Comment
                "Risk Before: < 1 in 500. Risk After: 1 in 757", // Comment
                ["CS_RISK_TABLE", "Risk Table", "L"]

            );

            hlSegments.addSegment("Report",
                "",
                "PDF^Image^PDF^Base64^JVBERi0xLjQKJaqrrK0KNCAwIG9iago8PAovVGl0bGUgKLPn"
            );

            var parser = new hl7.Parser();

            var msg = parser.parse(hlSegments.toString());
            var fileName= '';

            /*get the name of patient*/
            msg.getSegments("PID").forEach(function(segment) {
                fileName = segment.getComponent(5, 1)
            });

            var now = new Date();
            var currentDate = now.getFullYear()+''+now.getMonth()+''+now.getDate()+''+now.getHours()+''+now.getMinutes()+''+now.getSeconds();
            var fileFullName = fileName + currentDate+'.hl7';
            var filePath = path.join(__dirname, fileFullName);
            
            fs.writeFile(filePath, msg.toString(), function (err) {
                if (err) throw err;
                console.log('It\'s saved! in same location.');

            });

            /*sending the file on ftp*/
            var connectionProperties = {
                host: "assets.taalomat.com",
                user: "assetstmt",
                password: "P@ssw0rd"
            };

              var c = new Client();
              
              c.on('ready', function() {
                c.put(filePath, fileFullName, function(err) {
                  if (err) {
                    throw err;
                  };
                  console.log('pushed the file in the ftp server');
                  c.end();
                    return mc.reply({});
                });
              });

              c.connect();


          
    }

});
