// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// in memory cache
var tempCache = {};

tempCache.createEntry = function(id) {
  var cacheEntry = {};
  tempCache[id] = cacheEntry;
  cacheEntry.headerLoaded = false;
  cacheEntry.loaded = false;
  cacheEntry.timeout = setTimeout(
    function() {
      console.log('Delete timeout for id: ' + id);

      tempCache.deleteEntry(id);      
    },
    5 * 60 * 1000 /* 5 minutes */
  );
  
  return cacheEntry;
}

tempCache.getOrCreateEntry = function(id) {
  var cacheEntry = this[id];
  if (cacheEntry === undefined) {
    cacheEntry = this.createEntry(id); 
  }
  
  return cacheEntry;
}

tempCache.deleteEntry = function(id) {
  delete this[id];
}

app.post("/temp", function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');  

  const id = request.query["id"];
  
  const cacheEntry = tempCache.getOrCreateEntry(id);
  
  cacheEntry.contentType = request.header("Content-Type");
  cacheEntry.contentDisposition = request.header("Content-Disposition");
  
  cacheEntry.headerLoaded = true;
  if (cacheEntry.onheaders !== undefined) {
    cacheEntry.onheaders();
  }

  console.log('Receiving temp data...');
  console.log('Content type: ' + cacheEntry.contentType);
  console.log('Content disposition: ' + cacheEntry.contentDisposition);
  

  cacheEntry.loaded = false;
  cacheEntry.contentLength = 0;
  cacheEntry.content = [];

  
  request.on('data', function(chunk) {
    cacheEntry.content.push(chunk);
    cacheEntry.contentLength = cacheEntry.contentLength + chunk.length;

    if (cacheEntry.ondata !== undefined) {
      cacheEntry.ondata();
    }
  }).on('end', function() {
    cacheEntry.loaded = true;

    if (cacheEntry.onload !== undefined) {
      cacheEntry.onload();
    }
    
    console.log("Temp data uploaded; size: " + cacheEntry.contentLength);
    response.sendStatus(200);
  });
  
});

function writeTempResponseHeaders(response, cacheEntry) {
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Cache-Control', 'max-age=0');
  if (cacheEntry.contentType !== undefined) {
    response.setHeader('Content-Type', cacheEntry.contentType);
    console.log('Response-Content-Type:' + cacheEntry.contentType);
  }
  else {
    console.log('Response-Content-Type:' + cacheEntry.contentType);  
  }

  if (cacheEntry.contentDisposition !== undefined) {
    response.setHeader('Content-Disposition', cacheEntry.contentDisposition);
  }
}

function writeTempResponseAvailableChunks(response, cacheEntry) {
  const length = cacheEntry.content.length;
  for (var i = 0; i < length; i++) {
    const chunk = cacheEntry.content[i];

    const buff = Buffer.from(chunk, "binary");
    response.write(buff);
  }  

  //we can clear the already written content, since we are serving the entry just once
  cacheEntry.content = [];  
}

function endTempResponse(response, id) {
  response.end();
  tempCache.deleteEntry(id);
  
  
}

function sendTempResponse(response, cacheEntry, id) {
    writeTempResponseHeaders(response, cacheEntry);
    writeTempResponseAvailableChunks(response, cacheEntry);
    endTempResponse(response, id);
}


app.get("/temp", function (request, response) {
  const id = request.query["id"];
  const cacheEntry = tempCache.getOrCreateEntry(id);
  

  if (cacheEntry.loaded) {
    console.log('Content already posted, just sending back!');

    sendTempResponse(response, cacheEntry, id);
  }
  else {
    console.log('Content not yet posted, going async!');

    if (cacheEntry.headerLoaded) {
      writeTempResponseHeaders(response, cacheEntry);
    }
    else {
      cacheEntry.onheaders = function() {
        writeTempResponseHeaders(response, cacheEntry);
      };
    }

    if (cacheEntry.onload === undefined) {
      cacheEntry.ondata = function() {
        writeTempResponseAvailableChunks(response, cacheEntry);
      };

      cacheEntry.onload = function() {
        console.log('Finished posting back async!');
        endTempResponse(response, id);
      };

    }
    else {
      console.log('No multiple gets for the same posted data!')
      //multiple gets are not accepted, while data is beeing posted into the cache
      response.sendStatus(404);//not found
    }             
  }
  
});

/*
app.get("/dreams", function (request, response) {
  response.send(dreams);
});

// could also use the POST cacheEntry instead of query string: http://expressjs.com/en/api.html#req.cacheEntry
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});


// Simple in-memory store for now
var dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
  ];
*/

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});