var express = require('express');
var router = express.Router();
require('express-ws')(router);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'ShareCode' });
});

var ShareDB = require('sharedb');
var otText = require('ot-text');
ShareDB.types.register(otText.type);
var db = require('../db');
const dbconfig = require('sharedb-mongo')('mongodb://'+db.user+':'+db.pwd+'@'+db.host+':'+db.port+'/'+db.database);
var share = new ShareDB({db: dbconfig});

router.ws('/ws', function(ws, req) {
    var WebSocketJSONStream = require('websocket-json-stream');
    var stream = new WebSocketJSONStream(ws);
    share.listen(stream);

    // create the doc if it doesn't exists
    var doc = share.connect().get('code', 'example.java');
    doc.fetch(function(err) {
        if (err) throw err;
        if (doc.type === null) {
            doc.create('', otText.type.name);
        }
    });
});

router.post('/best-matching', function(req, res) {
    if(!(req.body.type && req.body.method && req.body.calledMethods && req.body.className)) {
        res.sendStatus(400);
        return;
    }

    var encodedVector = [];
    var inNames = ['Page.createContents', 'Page.performOk'];
    var callablesNames = ['new', 'setText', 'setFont', 'getText'];
    inNames.forEach(function(classMethod) {
        encodedVector.push(classMethod == req.body.className+'.'+req.body.method ? 1 : 0);
    });

    callablesNames.forEach(function(method) {
        encodedVector.push(req.body.calledMethods.indexOf(method) > -1 ? 1 : 0);
    });

    res.json(encodedVector);
});

module.exports = router;
