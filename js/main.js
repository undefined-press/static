;(function (w,d,r,h,b,l) {

  'use strict';

  var _p = l.protocol === 'https:' ? 'https:' : 'http:';
  var _o = 'origin' in l ? l.origin : l.host;

  eventWireup();

  ajaxCSS([('https://cdn.rawgit.com/undefined-press/static/master/css/fonts.css')], useFonts);

  function eventWireup () {
    if(!('addEventListener' in w)) { return; }
    w.addEventListener('load', handleLoad, false);
  }

  function handleLoad () {
    w.removeEventListener('load', handleLoad, false);
    loadImages([].slice.call(d.querySelectorAll('img[data-src]')));
  }

  function useFonts () {
    r.setAttribute('data-fonts-loaded','true');
  }

  function loadImages (imgs) {
    if (imgs.length < 1) { return; }

    return w.requestAnimationFrame(function () {
      imgs[0].src = imgs[0].getAttribute('data-src');
      imgs[0].removeAttribute('data-src');

      imgs[0].addEventListener('load', function () {
        return loadImages(imgs.slice(1));
      }, false);

      imgs[0].addEventListener('error', function () {
        return loadImages(imgs.slice(1));
      }, false);
    });
  }

  function ajaxCSS (urls, callback, errhandler) {
    var _k = 0;
    var _xhr;
    var _cors;

    if (w.toString.call(urls) !== '[object Array]' || urls.length < 1 || !('XMLHttpRequest' in w || 'XDomainRequest' in w)) { return; }

    _cors = 'withCredentials' in (new XMLHttpRequest()) ? 'XMLHttpRequest' : 'XDomainRequest';

    for (; urls.length > _k; ++_k) {
      _xhr = new w[_cors]();
      _xhr.open('GET', urls[_k], true);
      //_xhr.setRequestHeader('X-Requested-With', _cors);
      //_xhr.setRequestHeader('Content-Type', 'text/css');
      _xhr.onreadystatechange = applyXHRCSS(callback);
      _xhr.onerror = _xhr.ontimeout = handleXHRError(errhandler);
      _xhr.send(null);
    }
  }

  function applyXHRCSS (func) {
    return function (e) {
      var _ev;
      if (!e || !e.target || e.type !== 'readystatechange') { return; }
      _ev = e.target;
      if (_ev.readyState === 4 && _ev.status > 199 && _ev.status < 300) {
        h.insertAdjacentHTML('beforeend', '<style type="text/css">' + _ev.responseText + '</style>');
        if (!!func) { return func(); }
      }
    };
  }

  function handleXHRError (func) {
    return function (e) {
      if (!e) { return; }
      if (!!func) { return func(e); }
    };
  }

})(window,document,document.documentElement,document.getElementsByTagName('head')[0],document.getElementsByTagName('body')[0],window.location);
