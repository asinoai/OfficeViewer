

$(function() {    
  
  const SITE_ROOT = 'officeviewer.glitch.me';
  
  const BLOB_DATA_TAG = 'blob-data';
  const HAS_OPEN_VIEW_CLICK_TAG = 'has-open-view-click';
  const TARGET_TAG = 'target';

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
  
  function uploadToTemp(data, tempId) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/temp?id=' + tempId, true);
    xhr.onload = function(e) {
      if (this.status == 200) {
        console.log(this.responseText);
      }      
    };
    
    xhr.setRequestHeader("x-file-name", encodeURIComponent(data.name));
    xhr.send(data);
  }

  
  function buildViewURL(tempId) {
    return 'https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2F'+ SITE_ROOT +'%2Ftemp%3Fid%3D' + tempId;
  }
  
  function buildSelectorByAttribute(attributeName) {
    return '['+ attributeName +']';
  }
  
  function buildSelectorById(id) {
    return '#'+ id;
  }
  
  
  $('input[view-type=online]').on('change', function(event) {
    const $anchor = $(buildSelectorById($(this).attr(TARGET_TAG)));
    
    const blob = this.files[0]; //multiple selections are not supported!
    $anchor.prop(BLOB_DATA_TAG, blob);
    
    if (!$anchor.is(buildSelectorByAttribute(HAS_OPEN_VIEW_CLICK_TAG))) {
      $anchor.click(function () {
        const tempId = createUUID();
        const this$ = $(this); 

        this$.attr(TARGET_TAG, tempId);
        this$.attr('href', buildViewURL(tempId));

        uploadToTemp(this$.prop(BLOB_DATA_TAG), tempId);
      });
      
      $anchor.attr(HAS_OPEN_VIEW_CLICK_TAG, '');
    }
  });
  
});
