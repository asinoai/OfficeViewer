
function createUUID() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}

$(function() {
  console.log('hello world :o');
    
  function uploadToTemp(data, tempId) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/temp?id=' + tempId, true);
    xhr.onload = function(e) {
      if (this.status == 200) {
        console.log(this.responseText);
      }      
    };
    
    xhr.setRequestHeader("x-file-name", data.name);
    xhr.send(data);
  }
  
  $('a[view-type=online]').click(function(event) {
    const $anchor = $(this);
    
    var tempId = createUUID();
    
    if ($anchor.attr('href-original') === undefined) {
      $anchor.attr('href-original', $anchor.attr('href'));
    }

    $anchor.attr('href', 'https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fhoneysuckle-eye.gomix.me%2Ftemp%3Fid%3D' + tempId);

    var hrefOriginal = $anchor.attr('href-original');
    
    var xhr = new XMLHttpRequest();
    try {
      xhr.open('GET', hrefOriginal, true);
      xhr.responseType = 'blob';

      xhr.onload = function(e) {
        if (this.status == 200) {
          console.log('Downloaded; size: ' + this.response.size);
          uploadToTemp(this.response, tempId);
        }
        else {
          uploadToTemp("", tempId);
        }
      };

      xhr.onerror = function(e) {
        uploadToTemp("", tempId);
      }

      xhr.send();
      console.log('Custom download started...');
    }
    catch (err) {
        uploadToTemp("", tempId);
    }
    
  });
  
  
  $('input[view-type=online]').on('change', function(event) {
    const $anchor = $("#" + $(this).attr('target'));
    
    const blob = this.files[0];
    $anchor.prop('blob-data', blob);
    
    if ($anchor.attr('has-open-view-click') !== 'true') {
      const openViewClick = function (){
        const tempId = createUUID();
        const this$ = $(this); 

        this$.attr('href', 'https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fhoneysuckle-eye.gomix.me%2Ftemp%3Fid%3D' + tempId);
        //this$.attr('href', '/temp?id=' + tempId);

        uploadToTemp(this$.prop('blob-data'), tempId);
      }
      
      $anchor.attr('has-open-view-click', 'true');
      $anchor.click(openViewClick);
    }
  });
  
});
