var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.sendFile('index.html', {"root": "./client/html"});
});

router.get('/terms', function (req, res) {
    res.sendFile('terms.html', {"root": "./client/html"});
});

module.exports = router;