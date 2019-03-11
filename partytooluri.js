#! /usr/bin/env node
const request = require ('request');

const apiBaseUrl = "https://habitica.com/api/v3/";
const authData = require('./authdata');

function getMemberList() {
  const userUrl=apiBaseUrl+"groups/party/members";
  var options = {"uri":userUrl};
  options.headers = { "x-api-user":authData['id'],"x-api-key":authData['apitoken']};

  request.get(options,function(error,resp,body) {
    if (typeof body === "string") {
      const prefix = "https://habiticapartytools.surge.sh/?users=";
      var j = JSON.parse(body);
      var m = j.data;
      var ids = m.map(function (x) { return x._id; });
      var res = ids.join('|');
      console.log(prefix+res);
    }
  });
}
getMemberList();
