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

module.exports = router;
