var express = require('express');
var router = express.Router();
var cookieParser = require('cookie-parser');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("cookies:", req.cookies);
  let username = req.cookies['username'];
  res.render('index', {
    title: 'Express',
    username: req.cookies['username'] || "Unknown",
    uuid: req.cookies['uuid'] || ""
  });
});

router.post('/setUsername', function(req, res) {
  res.cookie('username', req.body.username, {
    maxAge: 60 * 60 * 24 * 9001,
    httpOnly: true
  });
  res.send('Cookie has been set.');
});

router.post('/setUuid', function(req, res) {
  res.cookie('uuid', req.body.uuid, {
    maxAge: 60 * 60 * 24 * 9001,
    httpOnly: true
  });
  res.send('Cookie has been set.');
});

module.exports = router;
