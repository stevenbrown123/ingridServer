var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('draw', { title: 'INGRID: Draw' });
});

router.get('/:value', function(req, res, next){
    res.render('draw', {title:'INGRID: Draw ' + req.params.value});
});

module.exports = router;
