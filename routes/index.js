var express = require('express');
var router = express.Router();
require('express-ws')(router);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {title: 'ShareCode'});
});

var ShareDB = require('sharedb');
var otText = require('ot-text');
ShareDB.types.register(otText.type);
var db = require('../db');
const dbconfig = require('sharedb-mongo')('mongodb://' + db.user + ':' + db.pwd + '@' + db.host + ':' + db.port + '/' + db.database);
var share = new ShareDB({db: dbconfig});

router.ws('/ws', function(ws, req) {
    var WebSocketJSONStream = require('websocket-json-stream');
    var stream = new WebSocketJSONStream(ws);
    share.listen(stream);

    // create the doc if it doesn't exists
    var doc = share.connect().get('code', 'example.java');
    doc.fetch(function(err) {
        if(err) throw err;
        if(doc.type === null) {
            doc.create('', otText.type.name);
        }
    });
});

router.post('/matrix', function(req, res) {
    if(!req.body.type) {
        res.sendStatus(400);
        return;
    }

    if(req.body.type == 'Text') {
        res.json({
            inMethods: [{className: 'Page', name: 'createContents'}, {className: 'Page', name: 'performOk'}],
            callableMethods: [
                {name: 'new', type: 'Text', parameters: ''},
                {name: 'setText', type: 'void', parameters: 'Text text'},
                {name: 'setFont', type: 'void', parameters: 'Font font'},
                {name: 'getText', type: 'Text', parameters: ''}
            ],
            matrix: [
                '101110',
                '101000',
                '010001',
                '101100',
                '010101'
            ]
        });
    } else {
        res.sendStatus(404);
    }
});


router.get('/methods', function(req, res) {
    if(!req.query.type) {
        res.sendStatus(400);
        return;
    }

    if(req.query.type == 'Page') {
        res.json([
            {
                name: 'createContents',
                type: 'void',
                parameters: '',
                freq: 1
            },
            {
                name: 'performOk',
                type: 'void',
                parameters: 'int arg1, boolean arg2',
                freq: 0.5
            }
        ]);
    }
});

module.exports = router;
