;(function (win, doc, root, body, loc) {
  'use strict';
  
  var _UI = {
    'input'  : doc.getElementById('qfield'),
    'results': doc.getElementById('qresults'),
    'counter': doc.getElementById('qcount'),
    'close'  : doc.getElementById('qclose')
  };
  var _d = (new Date().getTime() / 1000 / 60 / 60);
  var _attrs = ['title'];
  var _cache = 24;
  var _idx = 'jsearch_und';
  var _local = {
    'unixdate': 0,
    'index': ''
  };
  var _links, _xhr, _local;

  if (!('localStorage' in win && 'map' in [] && 'filter' in [] && 'reduce' in [] && 'DOMParser' in win && 'compile' in RegExp.prototype)) { return; }
  if (!('origin' in loc)) { loc.origin = loc.protocol + '//' + loc.host; }

  scrollSwitch();

  if (_cache > 0 && !!(localStorage.getItem(_idx))) {
    _local = JSON.parse(localStorage.getItem(_idx));
  }

  if (!!_local.unixdate && !!(_d - _local.unixdate < _cache)) {
    handleFetchedFeed(_local.index);
    eventWireup();

  } else {
    _xhr = new XMLHttpRequest();
    _xhr.open('GET', 'https://www.undefined.press/feeds/posts/default?alt=rss', true);
    _xhr.onerror = _xhr.ontimeout = _xhr.onabort = handleFetchError;
    _xhr.onload = handleFetchedFeed;
    _xhr.send(null);
  }

  function eventWireup() {
    body.addEventListener('click', handleClick, false);
    win.addEventListener('hashchange', scrollSwitch, false);
    _UI.input.addEventListener('keydown', rebounce(handleSearchAttempt), false);
    _UI.close.addEventListener('click', resetSearchResults, false);
  }

  function handleFetchedFeed (e) {
    var _evt = typeof e === 'object' ? e.target.responseText : e;
    var _doc = new DOMParser().parseFromString(_evt, 'application/xml');

    if (!_doc || !_doc.documentElement) { throw (new Error('No document at resource')); }
    if (!!_doc.querySelector('parsererror')) { throw (new Error('Parser error: invalid markup')); }

    _links = [].slice.call(
      _doc.getElementsByTagName('item')
        ).map(function (item) {
          var _composite = item.querySelector('link');
          _composite.setAttribute('title', item.querySelector('title').textContent);
          _composite.setAttribute('data-time', item.querySelector('pubDate').textContent);
          _composite.setAttribute('href', _composite.textContent);
          _composite.textContent = item.querySelector('description').textContent;
          return _composite;
        });

    if (typeof e === 'object') {
      _local = {
        'unixdate': _d,
        'index': e.target.responseText
      };
      localStorage.setItem(_idx,JSON.stringify(_local));
    }

    eventWireup();
  }

  function handleSearchAttempt (e) {
    var _query;
    if (typeof _links !== 'object' || win.toString.call(_links) !== '[object Array]' || !_links) { return; }

    typeof e !== 'undefined' && e.preventDefault();

    _query = _UI.input.value.length > 0 ? _UI.input.value : '';

    if (typeof _query !== 'string') { return; }

    displaySearchResults(_query, getSearchResults(_query, _links));
  }

  function displaySearchResults (query, results) {

    resetSearchResults();

    _UI.counter.textContent = (typeof query !== 'string' || query.length < 1) ? 'Please type a query' :
      results.length + (results.length === 1 ? ' result' : ' results') + ' found for \u201C' + query + '\u201D';

    if (query.length < 1 || results.length < 1) { return; }

    _UI.results.insertAdjacentHTML('beforeend', generateMarkup(results));
  }

  function getSearchResults (query, data) {
    return data.filter(function (link) {

      var _attr_vals = _attrs.map(function (attr) {
        return !!link.getAttribute(attr) ? link.getAttribute(attr) : '';
      });

      _attr_vals[(_attr_vals.length)] = !!link.textContent ? link.textContent.toLowerCase() : '';

      return !!occursAtLeastOnce(query.toLowerCase(), _attr_vals);
    }).map(function (link) {
      var _title   = !!link.getAttribute('title') ? link.getAttribute('title') : '';
      var _url     = !!link.getAttribute('href')  ? link.getAttribute('href')  : '';
      var _date    = !!link.getAttribute('data-time') ? link.getAttribute('data-time') : '';
      var _content = sanitize(link.textContent);
      return {
        'title': _title,
        'url': _url,
        'date': _date,
        'content': _content,
        'ldistance': bestOf(query.toLowerCase(), [_title.toLowerCase(), _url.toLowerCase(), _date, _content.toLowerCase()])
      };
    }).sort(function (p, q) {
      if (p.ldistance < q.ldistance) { return -1; }
      if (p.ldistance > q.ldistance) { return 1; }
      return 0;
    });
  }

  function generateMarkup (results) {
    return results.map(function (result) {
      return '<div class="cell cell-md-6 cell-lg-4 search-result"><a href="' + result.url +
             '" title="' + result.title +
             '"><h6><span>' + result.title +
             '</span></h6><p>' + (new Date(result.date).toLocaleDateString().replace(/\//g,'.')) +
             '</p></a></div>';
    }).reduce(function (acc, nxt) {
      return acc + nxt;
    });
  }

  function bestOf (query, candidates) {
    return candidates.map(function (candidate) {
      return getLevenshteinDistance(query, candidate);
    }).sort(function (p, q) {
      if (p < q) { return -1; }
      if (p > q) { return 1; }
      return 0;
    }).filter(function (item, idx) {
      return idx === 0;
    });
  }

  function occursAtLeastOnce (query, data) {
    return data.map(function (datum) {
      if (datum.length < query.length) { return false; }
      return datum.indexOf(query) !== -1;
    }).reduce(function (w, x) {
      return !!(w || x);
    });
  }

  function getLevenshteinDistance (string, to_match) {
    var distance, row1, row2, i, j;
    for (row2 = [i = 0]; string[i]; ++i) {
      for (row1 = [j = 0]; to_match[++j];) {
        distance = row2[j] = !!i ?
          getMin(
            row2[--j],
            (
              getMin(
                row1[j] - (string[i - 1] === to_match[j]),
                row1[++j] = row2[j]
            )
          )
        ) + 1 :
        j;
      }
    }
    return distance;
  }

  function getMin(one, two){
    return one > two ? two : one;
  }

  function sanitize (text) {
    return text.split('').map(function (char) {
      return char === '<' ? '&lt;' : char === '>' ? '&gt;' : char
    ;}).join('');
  }

  function resetSearchResults () {
    var _res = _UI.results.querySelectorAll('.search-result');
    var _r = 0;
    for (; _res.length > _r; ++_r) {
      _res[_r].parentNode.removeChild(_res[_r]);
    }
  }

  function handleFetchError () {
    console.warn('Error with request: ' + this.status);
  }

  function rebounce (func) {
    var _scheduled, _context, _args, _i, _j;
    return function () {
      _context = this;
      _args = [];
      _i = arguments.length;
      _j = 0;

      for (; _j < _i; ++_j) {
        _args[_j] = arguments[_j];
      }

      if (!!_scheduled) {
        win.cancelAnimationFrame(_scheduled);
      }

      _scheduled = win.requestAnimationFrame(function () {
        func.apply(_context, _args);
        _scheduled = null;
      });
    }
  }

  function scrollSwitch () {
    var _hash = loc.hash.charAt(0) !== '#' ? '#' : loc.hash;
    if (_hash.charAt(1) === 's') {
      body.classList.add('noscroll');
    } else {
      body.classList.remove('noscroll');
    }
  }
  
  function handleClick (e) {
    var _evt = e.currentTarget;
    if (typeof _evt !== 'object') return;
    switch (_evt.id) {
      case 'qopen':
        root.setAttribute('data-search', 'true');
        break;
      case 'qclose':
        root.setAttribute('data-search', 'false');
        break;
    }
  }

})(window, document, document.documentElement, document.getElementsByTagName('body')[0], window.location);
