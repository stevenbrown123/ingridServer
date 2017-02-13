var express = require('express');
var router = express.Router();
var mysql = require("mysql");
var con = require("../database.js").connection;
var request = require('request');

router.get('/', function (req, res, next) {
    var fill = {};
    var changeFill = function(input)
    {
        fill.invs = JSON.stringify(input);
        basic = JSON.stringify(fill.invs);
        res.render('index', fill);
    };
    var header = {
        url: "http://www.ingrid2.com/rpc",
        method: "POST",
        json: {}};
    request( header, function (error, response, body) {
        if (error)
            console.log(error);
        changeFill(body);
    });
});


router.post('/save', function (req, res, next) {
    var fill = {};
    var callback = function(id){
        res.send(req.protocol + '://' + req.get('host') + "/" + id);
    };
    con.query("INSERT INTO ingrid2 VALUES(NULL, '" + JSON.stringify(req.body) + "', CURDATE());", function (err, rows) {
        if (err) {
            console.log(err);
            callback(-1);
        }
        if(rows)
            callback(rows.insertId);
        else
            res.send("invalid input");
    });
});

router.get('/:value', function (req, res, next) {
    var fill = {};
    if (req.params.value != "favicon.ico") {
        var id = req.params.value;

        var queryString = "SELECT * FROM ingrid2 WHERE EXISTS(select 1 from ingrid2 where id=" + mysql.escape(id) + ") and id=" + mysql.escape(id) + ";";
        con.query(queryString, function (err, rows) {
            if (err) {
                console.log("There was an error looking for " + id + " so we are cancelling");
                return -1;
            }
            if(rows[0] && rows[0].info)
            {
                fill.invs = rows[0].info;
                res.render('index', fill);
            }
            else
            {
                res.redirect('/');
            }
        });
    }
});
module.exports = router;