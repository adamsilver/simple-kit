App.SimulateLink = function(options) {
  this.link = $(options.container);
  this.link.on('click', $.proxy(this, 'onClick'));
};

App.SimulateLink.prototype.onClick = function(e) {
  e.preventDefault();
  var width = 430;
  var height = 782;

  // position to the right of this window, without covering it
  var gap = 100;
  var openerLeft = window.screenX || window.screenLeft || 0;
  var openerWidth = window.outerWidth || 0;
  var left = Math.min(openerLeft + openerWidth + gap, screen.width - width - gap);
  var top = (window.screenY || window.screenTop || 0) + gap;

  window.open(this.link.attr('href'), '_blank', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',noopener,noreferrer');
};
