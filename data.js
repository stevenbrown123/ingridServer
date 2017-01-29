var INGRID = require("./init.json");

// returns a new INGRID object
var newINGRIDObject = function(){
    return Object.assign({}, INGRID);
};

// accumulate the request body and update the INGRID object. Then return the updated object
// reqBody tracks the min/max or boolean value of the invariants. The reqBody parameter is the output
//  of the POST from the INGRID page. This transformed data will be sent to the INGRID server.
// ingrObj is the current data from the INGRID object. It will be different between users and therefore
//  should be passed around.
// All input are either 'invar'min or 'invar'max ,or boolean valued. Thus, there should be no problem
//  separating them accordingly. There is also a default value called 'values' which is to be ignored.
var collect = function(reqBody, ingrObj)
{
    // the invariant object from the previous INGRID obj
    var givenInvariants = ingrObj;
    var keys = Object.keys(reqBody);
    keys.forEach(function(key){
        var invarName = "";

        // If the string ends in min, indicating a number-valued invariant
        if(key.length > 3 && key.slice(-3) == "min"){
            invarName = key.substring(0,key.length-3);
            var chan = (reqBody[key] !== givenInvariants[invarName].Value.Min);
            if (chan)
            {
                givenInvariants[invarName].Changed = "True";
            }
            givenInvariants[invarName].Value.Min = reqBody[key];
        }
        // if the string ends in max, indicating a number-valued invariant
        else if(key.length > 3 && key.slice(-3) == "max")
        {
            invarName = key.substring(0,key.length-3);
            var chan = (reqBody[key] !== givenInvariants[invarName].Value.Max);
            if (chan)
            {
                givenInvariants[invarName].Changed = "True";
            }
            givenInvariants[invarName].Value.Max = reqBody[key];
        }
        // the condition to ignore the 'values' input. May eventually be in charge of doing something
        //  although unlikely.
        else if(key === "values" || key === "invarType")
        {

        }
        // if we have a boolean value
        else
        {
            invarName = key;
            var chan = (reqBody[key] !== givenInvariants[invarName].Value);
            if (chan)
            {
                givenInvariants[invarName].Changed = "True";
            }
            givenInvariants[invarName].Value = reqBody[key];
        }
    });

    return givenInvariants;
};

// combine the data, and turn min/max values into a single
var combine = function(input){
    return input;
};
module.exports = {
    create: function(){return newINGRIDObject()},
    combine: collect,
};