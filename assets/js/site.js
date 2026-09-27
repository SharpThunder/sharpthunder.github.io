// Theme toggle: remembers the choice; falls back to the OS setting.
(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
})();

// Terminal: reveal the plan line by line. Without JS or with reduced motion, it's shown in full.
(function () {
  var pre = document.querySelector('[data-typed] code');
  if (!pre || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lines = pre.innerHTML.split('\n');
  pre.innerHTML = lines.map(function (l) { return '<span class="tline">' + (l || ' ') + '</span>'; }).join('\n');
  var spans = pre.querySelectorAll('.tline');
  spans.forEach(function (s) { s.style.visibility = 'hidden'; });
  var i = 0;
  (function next() {
    if (i >= spans.length) return;
    spans[i].style.visibility = 'visible';
    i++;
    setTimeout(next, i === 1 ? 500 : 70);
  })();
})();
