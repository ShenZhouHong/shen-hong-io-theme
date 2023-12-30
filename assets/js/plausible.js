// Custom variant of Plausible.io's JavaScript Tracker. Derived from the
// plausible.file-downloads.outbound-links.js
// located at plausible/analytics/priv/tracker/js. This is the un-minified
// version templated from the plausible/analytics repository, then modified
// with my Plausible Nginx proxy's details hardcoded in.
// This will be minified later on with my own toolchain.
//
// This file is equivalent to:
// <script defer data-api="/api/event" data-domain="shen.hong.io" src="/event.js"></script>

(function(){
    'use strict';
  
    var location = window.location
    var document = window.document
  
    var scriptEl = document.currentScript;
    var endpoint = '/api/event'; // || scriptEl.getAttribute('data-api') || defaultEndpoint(scriptEl)
  
    function onIgnoredEvent(reason, options) {
      if (reason) console.info('Ignoring Event: ' + reason);
      options && options.callback && options.callback()
    }
  
    // function defaultEndpoint(el) {
    //   return new URL(el.src).origin + '/api/event'
    // }
  
  
    function trigger(eventName, options) {
      if (/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) || location.protocol === 'file:') {
        return onIgnoredEvent('localhost', options)
      }
      if (window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress) {
        return onIgnoredEvent(null, options)
      }
      try {
        if (window.localStorage.plausible_ignore === 'true') {
          return onIgnoredEvent('localStorage flag', options)
        }
      } catch (e) {
  
      }
  
      var payload = {}
      payload.n = eventName
      payload.u = location.href
      payload.d = 'shen.hong.io' // scriptEl.getAttribute('data-domain')
      payload.r = document.referrer || null
      if (options && options.meta) {
        payload.m = JSON.stringify(options.meta)
      }
      if (options && options.props) {
        payload.p = options.props
      }
  
  
  
      var request = new XMLHttpRequest();
      request.open('POST', endpoint, true);
      request.setRequestHeader('Content-Type', 'text/plain');
  
      request.send(JSON.stringify(payload));
  
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          options && options.callback && options.callback()
        }
      }
    }
  
    var queue = (window.plausible && window.plausible.q) || []
    window.plausible = trigger
    for (var i = 0; i < queue.length; i++) {
      trigger.apply(this, queue[i])
    }
  
      var lastPage;
  
      function page() {
        if (lastPage === location.pathname) return;
        lastPage = location.pathname
        trigger('pageview')
      }
  
      var his = window.history
      if (his.pushState) {
        var originalPushState = his['pushState']
        his.pushState = function() {
          originalPushState.apply(this, arguments)
          page();
        }
        window.addEventListener('popstate', page)
      }
  
      function handleVisibilityChange() {
        if (!lastPage && document.visibilityState === 'visible') {
          page()
        }
      }
  
      if (document.visibilityState === 'prerender') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      } else {
        page()
      }
  
    function getLinkEl(link) {
      while (link && (typeof link.tagName === 'undefined' || !isLink(link) || !link.href)) {
        link = link.parentNode
      }
      return link
    }
    
    function isLink(element) {
      return element && element.tagName && element.tagName.toLowerCase() === 'a'
    }
    
    function shouldFollowLink(event, link) {
      // If default has been prevented by an external script, Plausible should not intercept navigation.
      if (event.defaultPrevented) { return false }
    
      var targetsCurrentWindow = !link.target || link.target.match(/^_(self|parent|top)$/i)
      var isRegularClick = !(event.ctrlKey || event.metaKey || event.shiftKey) && event.type === 'click'
      return targetsCurrentWindow && isRegularClick
    }
    
    var MIDDLE_MOUSE_BUTTON = 1
    
    function handleLinkClickEvent(event) {
      if (event.type === 'auxclick' && event.button !== MIDDLE_MOUSE_BUTTON) { return }
    
      var link = getLinkEl(event.target)
      var hrefWithoutQuery = link && link.href && link.href.split('?')[0]
    
    
      if (isOutboundLink(link)) {
        return sendLinkClickEvent(event, link, { name: 'Outbound Link: Click', props: { url: link.href } })
      }
    
      if (isDownloadToTrack(hrefWithoutQuery)) {
        return sendLinkClickEvent(event, link, { name: 'File Download', props: { url: hrefWithoutQuery } })
      }
    }
    
    function sendLinkClickEvent(event, link, eventAttrs) {
      var followedLink = false
    
      function followLink() {
        if (!followedLink) {
          followedLink = true
          window.location = link.href
        }
      }
    
      if (shouldFollowLink(event, link)) {
        var attrs = { props: eventAttrs.props, callback: followLink }
        plausible(eventAttrs.name, attrs)
        setTimeout(followLink, 5000)
        event.preventDefault()
      } else {
        var attrs = { props: eventAttrs.props }
        plausible(eventAttrs.name, attrs)
      }
    }
    
    document.addEventListener('click', handleLinkClickEvent)
    document.addEventListener('auxclick', handleLinkClickEvent)
    
    function isOutboundLink(link) {
      return link && link.href && link.host && link.host !== location.host
    }
    
    var defaultFileTypes = ['pdf', 'xlsx', 'docx', 'txt', 'rtf', 'csv', 'exe', 'key', 'pps', 'ppt', 'pptx', '7z', 'pkg', 'rar', 'gz', 'zip', 'avi', 'mov', 'mp4', 'mpeg', 'wmv', 'midi', 'mp3', 'wav', 'wma']
    var fileTypesAttr = scriptEl.getAttribute('file-types')
    var addFileTypesAttr = scriptEl.getAttribute('add-file-types')
    var fileTypesToTrack = (fileTypesAttr && fileTypesAttr.split(",")) || (addFileTypesAttr && addFileTypesAttr.split(",").concat(defaultFileTypes)) || defaultFileTypes;
    
    function isDownloadToTrack(url) {
      if (!url) { return false }
    
      var fileType = url.split('.').pop();
      return fileTypesToTrack.some(function (fileTypeToTrack) {
        return fileTypeToTrack === fileType
      })
    }
    
  })();
  