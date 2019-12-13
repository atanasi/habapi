#! /usr/bin/env node
"use strict";

const moment = require('moment');
const { log, fetch } = require('./utils');

const authData = require('./authdata');

function startLoop() {
  function reschedule(cb) {
    var now = moment();
    var next = now.clone().add(10,'m');
    // var next = now.clone().add(15,'s');
    // console.log(now);
    var interval = next.diff(now);
    log("next execution in "+interval/1000);
    var cancelled = false;
    setTimeout(function () {
		if (cancelled) {
			log('Cancel from reschedule');
		} else {
			cb(null);
		}
	},interval);
  }
  function invoke(f,cb) {
	  log('Start '+f.name);
      f(function (e) {
		  if (!e) {
			  log('Finished '+f.name);
			  cb(null);
		  } else {
			  if (e.cancellation) {
				  log('Cancel from '+f.name);
				  cb(e);
			  } else {
				console.log(e);
				cb(null);
			  }
		  }
	  });
  }
  function checkErr(e) { if(e) throw e; }
  function loop() {
      invoke(scheduleCron,
      function (e) {
		  checkErr(e);
		  invoke(scheduleJoinQuest,
		  function (e) {
			  checkErr(e);
			 reschedule(function (e) {
				 checkErr(e);
				 loop();
			 }); 
		  });
	  });
  }
  loop();
}

function scheduleCron(cb) {
   var habId = authData["id"]
   var habToken = authData["apitoken"];
 
   var paramsTemplate = {
     "method" : "post",
     "headers" : {
       "x-api-user" : habId, 
       "x-api-key" : habToken
     }
   }
   
   var params = paramsTemplate;
   fetch("https://habitica.com/api/v3/cron", params,
   function (error, response) {
	  cb(error); 
   });
 }

function scheduleJoinQuest(cb) {
   var habId = authData['id'];
   var habToken = authData['apitoken'];
 
   var paramsTemplate = {
     "method" : "get",
     "headers" : {
       "x-api-user" : habId, 
       "x-api-key" : habToken    
     }
   }  
   fetch("https://habitica.com/api/v3/groups/party", paramsTemplate,
   function (error,response) {
	   if (error) { return cb(error); }
	   var party;
	   try {
		party = JSON.parse(response);
	   } catch(e) {
		   cb(e);
	   }
   
    if ((party.data.quest.key != undefined) && (party.data.quest.active != true) && (party.data.quest.members[habId] == undefined)){
    paramsTemplate = {
        "method" : "post",
        "headers" : {
          "x-api-user" : habId, 
          "x-api-key" : habToken
        }     
      }
      var params = paramsTemplate;
    
      fetch("https://habitica.com/api/v3/groups/party/quests/accept", params,
       function(error, response) {
		  if (!error) log("Quest accepted");
		  cb(error);
	  }); 
    } else {
      log("No quest invitation");
      cb(null);
    }
  });
}

startLoop();
log('started');
