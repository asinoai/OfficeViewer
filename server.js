// server.js

// init project
var express = require('express');
var path = require('path')

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

function calculateContentType(fileName, defaultValue) {
  const MAPPING = {
    ".doc":      "application/msword",
    ".dot":      "application/msword",

    ".docx":     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".dotx":     "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    ".docm":     "application/vnd.ms-word.document.macroEnabled.12",
    ".dotm":     "application/vnd.ms-word.template.macroEnabled.12",

    ".xls":      "application/vnd.ms-excel",
    ".xlt":      "application/vnd.ms-excel",
    ".xla":      "application/vnd.ms-excel",

    ".xlsx":     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xltx":     "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    ".xlsm":     "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".xltm":     "application/vnd.ms-excel.template.macroEnabled.12",
    ".xlam":     "application/vnd.ms-excel.addin.macroEnabled.12",
    ".xlsb":     "application/vnd.ms-excel.sheet.binary.macroEnabled.12",

    ".ppt":      "application/vnd.ms-powerpoint",
    ".pot":      "application/vnd.ms-powerpoint",
    ".pps":      "application/vnd.ms-powerpoint",
    ".ppa":      "application/vnd.ms-powerpoint",

    ".pptx":     "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".potx":     "application/vnd.openxmlformats-officedocument.presentationml.template",
    ".ppsx":     "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    ".ppam":     "application/vnd.ms-powerpoint.addin.macroEnabled.12",
    ".pptm":     "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
    ".potm":     "application/vnd.ms-powerpoint.template.macroEnabled.12",
    ".ppsm":     "application/vnd.ms-powerpoint.slideshow.macroEnabled.12"
  }
  
  const extension = path.extname(fileName);
  
  var result = MAPPING[extension];
  if (result === undefined) {
    result = defaultValue;
  }
      
  return result;
}


function calculateContentDisposition(fileName, defaultValue) {
   
   return defaultValue !== undefined ? defaultValue : 'attachment; filename="' + fileName + '"';
}

app.post("/temp", function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');  

  const id = request.query["id"];
  
  const cacheEntry = tempCache.getOrCreateEntry(id);
  
  const originalFileName = request.header("x-file-name");
  cacheEntry.contentType = calculateContentType(originalFileName, request.header("Content-Type"));
  cacheEntry.contentDisposition = calculateContentDisposition(originalFileName, request.header("Content-Disposition"));
  
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


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});