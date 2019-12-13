#! /usr/bin/env node
"use strict";

const { log, fetch } = require('./utils');

const authData = require('./authdata');

function fetchProfile(cb) {
   var url = "https://habitica.com/api/v3/members/"+authData["id"];
   var response;
   
   //set paramaters
   var params = {
     "method" : "get",
     "headers" : {
       "x-api-user" : authData['id'], 
       "x-api-key" : authData['apitoken']
     }
   }
   var result;
   fetch(url, params, function(error,response) {
	   if (error) throw error;
	   result = JSON.parse(response);
	   if (result.success) cb(result.data);
	   else {
	     console.log(result);
	     throw "InvalidResponse";
	   }
   });
}

function spellCaster(spellCode) {
  if (!spellCode) spellCode = "earth";
  return function (cb) {
    var params = {
       "method" : "post",
       "headers" : {
         "x-api-user" : authData['id'], 
         "x-api-key" : authData['apitoken']
       }
     }
     
     // console.log("casting");
     var result;
     fetch("https://habitica.com/api/v3/user/class/cast/"+spellCode, params,
     function (err, resp) {
		 if (!err) {
			 try {
				 result = JSON.parse(resp);
			 } catch (e) { err = e; }
		 }
		 if (err) {
			 console.log(err);
			 cb(true);
		 } else {
		    var msg = "failed";
	        if (result.success) msg = "success";
		     else throw "cast failed";
			 cb(false);
		 }
	 });
  };
}

function sleep(ms,cb) {
    setTimeout(function() {
        cb();
    }, ms);
}

function tryCast(fn,cb) {
  var maxRetries = 5;
  var r = 0;
  
  function loop() {
    fn(function (retry) {
	    if (retry) {
	      if (r >= maxRetries) throw "too many retries";
	      r++;
	      sleep(200,loop);
	    } else sleep(200,cb);
	});
  }
  loop();
}

function spellInfo(offset,cb) {
  fetchProfile(function (p) {
	  var cl = p.stats.class;
	
	  var spellName;
	  var spellCode;
	  var spellCost;
	  
	  if (cl==='wizard') {
	  spellName = "earthquake";
	  spellCode = "earth";
	  spellCost = 35.0;
	  } else if (cl==='healer') {
	  spellName = "protective aura";
	  spellCode = "protectAura";
	  spellCost = 30.0;
	  } else if (cl==='warrior') {
	  spellName = "valorous presence";
	  spellCode = "valorousPresence";
	  spellCost = 20.0;
	  } else if (cl==='rogue') {
	  spellName = "tools of the trade";
	  spellCode = "toolsOfTrade";
	  spellCost = 25.0;
	  } else throw "Invalid class "+cl;
	  
	  var mp = p.stats.mp;
	  cb({ count: Math.floor((mp+offset)/spellCost),
	    spellName: spellName, spellCode: spellCode });
   });
}

function main() {
  var a = process.argv[2];
  var sp, n;
  function f(sp) {	  
	var retries = 0;
	var i=0;
	function loop() {
	  if (i < sp.count) {
	    console.log ("casting "+ sp.spellName + " " + i);
	    tryCast(spellCaster(sp.spellCode), function() {
		  i++;
		  loop();
		});
	  }
    }
    loop();
  }
  if (a === "all") {
    spellInfo(0,f);
  } else {
    n = parseInt(a);
    spellInfo(n, function (sp) {
		if (n >= 0) sp.count = n;
		f(sp);
	});
  }
}

main();
