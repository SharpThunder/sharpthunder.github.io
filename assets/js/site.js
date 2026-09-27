(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- theme toggle: remembers the choice, falls back to the OS setting ----------
  function toggleTheme() {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    return root.dataset.theme;
  }
  var themeBtn = $('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // ---------- scroll progress in the header stripe ----------
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    h.style.setProperty('--scroll', max > 0 ? (h.scrollTop / max).toFixed(4) : 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- hero terminal: reveal the plan line by line ----------
  var pre = $('[data-typed] code');
  if (pre && !reduce) {
    pre.innerHTML = pre.innerHTML.split('\n').map(function (l) {
      return '<span class="tline">' + (l || ' ') + '</span>';
    }).join('\n');
    var lines = $$('.tline', pre);
    lines.forEach(function (s) { s.style.visibility = 'hidden'; });
    var li = 0;
    (function next() {
      if (li >= lines.length) return;
      lines[li++].style.visibility = 'visible';
      setTimeout(next, li === 1 ? 450 : 60);
    })();
  }

  // ---------- reveal on scroll + count-up numbers ----------
  function countUp(el) {
    var to = +el.dataset.count, from = el.dataset.from ? +el.dataset.from : 0, t0 = null, dur = 1100;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = $$('.block-head, .cards > *, .stats > div, .apply-log > li, .pipeline, .terminal.wide, .map, .cluster, .history > li, .offcall > li, .cta');
    targets.forEach(function (el) {
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(sibs, 6) * 70 + 'ms';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('[data-count]', en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // ---------- cursor glow on cards ----------
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    $$('.cards article, .offcall li, .stats > div').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--mx'); card.style.removeProperty('--my');
      });
    });
  }

  // ---------- spot interruption replay ----------
  var box = $('[data-cluster]'), log = $('[data-cluster-log]');
  if (box) {
    var APPS = ['api', 'web', 'worker', 'solver'];
    var seq = 0, nodes = [];
    function nodeName() { return 'ip-10-0-' + (10 + Math.floor(Math.random() * 80)) + '-' + (10 + Math.floor(Math.random() * 200)) + '.spot'; }
    function podEl(app) {
      var p = document.createElement('i');
      p.className = 'pod app-' + app;
      p.title = app + '-' + Math.random().toString(36).slice(2, 7);
      return p;
    }
    function addNode(state) {
      var n = document.createElement('div');
      n.className = 'knode ' + (state || '');
      n.innerHTML = '<span class="knode-name">' + nodeName() + '</span><span class="knode-state">' + (state === 'provisioning' ? 'provisioning' : 'Ready') + '</span><div class="pods"></div>';
      box.appendChild(n); nodes.push(n);
      return n;
    }
    function pods(n) { return $$('.pod', n); }
    function say(msg, cls) {
      if (!log) return;
      var line = document.createElement('div');
      line.className = 'ev ' + (cls || '');
      line.textContent = msg;
      log.appendChild(line);
      var all = $$('.ev', log);
      if (all.length > 4) all[0].remove();
    }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function lightest() { return nodes.filter(function (n) { return !n.classList.contains('draining'); }).sort(function (a, b) { return pods(a).length - pods(b).length; })[0]; }

    // initial state: 3 nodes, 12 pods
    for (var i = 0; i < 3; i++) {
      var n = addNode();
      for (var j = 0; j < 4; j++) $('.pods', n).appendChild(podEl(APPS[(i + j) % 4]));
    }

    async function loop() {
      while (true) {
        await wait(2600);
        var victim = nodes[Math.floor(Math.random() * nodes.length)];
        var name = $('.knode-name', victim).textContent;
        victim.classList.add('draining');
        $('.knode-state', victim).textContent = 'interruption';
        say('⚠ SpotInterruption  ' + name + '  (2 min notice)', 'warn');
        await wait(1300);
        say('cordon + drain  ' + name + '  ' + pods(victim).length + ' pods evicted', 'mod');
        var moving = pods(victim);
        moving.forEach(function (p) { p.classList.add('evicting'); });
        await wait(700);
        moving.forEach(function (p) {
          var target = lightest();
          p.classList.remove('evicting'); p.classList.add('pending');
          $('.pods', target).appendChild(p);
        });
        say('rescheduled  ' + moving.length + ' pods  ·  replicas kept serving', 'ok');
        await wait(600);
        moving.forEach(function (p) { p.classList.remove('pending'); });
        victim.classList.add('gone');
        await wait(500);
        victim.remove(); nodes.splice(nodes.indexOf(victim), 1);
        await wait(700);
        var fresh = addNode('provisioning');
        say('cluster-autoscaler  scale-up  +1 spot node', 'info');
        await wait(1400);
        fresh.classList.remove('provisioning');
        $('.knode-state', fresh).textContent = 'Ready';
        // rebalance: move pods from the busiest node onto the new one
        for (var k = 0; k < 4; k++) {
          var src = nodes.filter(function (n) { return n !== fresh; })
            .sort(function (a, b) { return pods(b).length - pods(a).length; })[0];
          if (!src || pods(src).length <= pods(fresh).length + 1) break;
          var p = pods(src).pop(); p.classList.add('pending'); $('.pods', fresh).appendChild(p);
        }
        setTimeout(function () { $$('.pod.pending', box).forEach(function (p) { p.classList.remove('pending'); }); }, 500);
        say('node ' + $('.knode-name', fresh).textContent + ' Ready · 0 errors', 'ok');
        seq++;
      }
    }
    if (!reduce) {
      // only animate while visible
      var started = false;
      var cio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !started) { started = true; loop(); }
      });
      cio.observe(box);
    } else {
      say('(animation paused: reduced motion)');
    }
  }

  // ---------- interactive terminal ----------
  var shell = $('#shell'), out = $('.shell-out'), form = $('.shell-form'), input = $('#shell-in'), openBtn = $('.shell-toggle');
  if (!shell) return;
  var S = window.SITE || {};
  var hist = [], hi = 0;

  function print(html, cls) {
    var d = document.createElement('div');
    d.className = 'sl ' + (cls || '');
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var cmds = {
    help: function () {
      return [
        '<b>available commands</b>',
        '  whoami                  who is this',
        '  kubectl get skills      what I work with',
        '  kubectl get pods        where I have worked',
        '  terraform plan          what I would bring',
        '  cat certs.txt           certifications',
        '  ls blog/                posts',
        '  contact                 how to reach me',
        '  sudo hire sinan         you know what this does',
        '  theme · clear · exit'
      ].join('\n');
    },
    whoami: function () { return 'sinan: DevOps engineer in Warsaw. Kubernetes, CI/CD, AWS, Terraform.\nWork-authorized in Poland: no sponsorship needed.'; },
    'kubectl get skills': function () {
      return '<b>NAME            READY   STATUS</b>\n' +
        '<span class="v-k8s">kubernetes</span>      1/1     Running   <span class="c-mod"># CKA 93/100</span>\n' +
        '<span class="v-aws">aws</span>             1/1     Running   <span class="c-mod"># incl. China partition</span>\n' +
        '<span class="v-tf">terraform</span>       1/1     Running\n' +
        '<span class="v-azure">azure-devops</span>    1/1     Running   <span class="c-mod"># &lt;1s deploys</span>\n' +
        '<span class="v-github">github-actions</span>  1/1     Running\n' +
        '<span class="v-gitlab">gitlab-ci</span>       1/1     Running\n' +
        '<span class="v-azure">azure</span>           1/1     Running\n' +
        '<span class="v-gcp">gcp</span>             1/1     Running\n' +
        'python          0/1     ContainerCreating   <span class="c-mod"># working on it</span>';
    },
    'kubectl get pods': function () {
      return '<b>NAME              STATUS       AGE</b>\n' +
        'ulula            <span class="c-add">Running</span>      1y7m\n' +
        'career-break      Completed    1y4m\n' +
        'powerdev          Completed    2y7m\n' +
        'gozen-holding     Completed    2y5m';
    },
    'terraform plan': function () {
      return '<span class="c-add">+</span> kubernetes platform work\n<span class="c-add">+</span> zero-downtime pipelines\n<span class="c-add">+</span> terraform module libraries\n<span class="c-add">+</span> calm on-call\n\n<b>Plan:</b> 4 to add, 0 to change, 0 to destroy.';
    },
    'cat certs.txt': function () { return '<span class="v-k8s">CKA</span>: Certified Kubernetes Administrator (93/100)\n<span class="v-aws">AWS</span> Certified Solutions Architect – Associate\n<span class="v-tf">HashiCorp</span> Terraform Associate'; },
    'ls blog/': function () { return 'drafts in progress. <a href="' + S.blog + '">open ~/blog</a>'; },
    contact: function () { return 'linkedin  <a href="' + S.linkedin + '">' + S.linkedin + '</a>\ngithub    <a href="' + S.github + '">' + S.github + '</a>'; },
    'sudo hire sinan': function () { return '[sudo] password for recruiter: ********\n<span class="c-add">✓ permission granted.</span> Next step: <a href="' + S.linkedin + '">say hi on LinkedIn</a>'; },
    'rm -rf /': function () { return '<span class="c-false">nice try.</span> this terminal has SSM, not SSH.'; },
    ls: function () { return 'about.txt  certs.txt  blog/'; },
    'cat about.txt': function () { return cmds.whoami(); },
    theme: function () { return 'theme: ' + toggleTheme(); },
    clear: function () { out.innerHTML = ''; return null; },
    exit: function () { close(); return null; }
  };
  cmds.hire = cmds['sudo hire sinan'];
  cmds['kubectl get nodes'] = cmds['kubectl get pods'];

  function run(raw) {
    var c = raw.trim().replace(/\s+/g, ' ');
    if (!c) return;
    hist.push(c); hi = hist.length;
    print('<span class="c-prompt">$</span> ' + esc(c), 'cmd');
    var fn = cmds[c.toLowerCase()];
    if (!fn && /^sudo /.test(c)) fn = function () { return 'sinan is not in the sudoers file. try: sudo hire sinan'; };
    var res = fn ? fn() : esc(c.split(' ')[0]) + ': command not found. type <b>help</b>';
    if (res) print(res);
  }
  function open() {
    shell.hidden = false; openBtn.setAttribute('aria-expanded', 'true');
    if (!out.childElementCount) print('welcome. type <b>help</b> to see commands.', 'muted');
    input.focus();
  }
  function close() { shell.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }

  openBtn.addEventListener('click', function () { shell.hidden ? open() : close(); });
  $('.shell-close').addEventListener('click', close);
  form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); input.value = ''; });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && hi > 0) { input.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      var m = Object.keys(cmds).filter(function (k) { return k.indexOf(input.value.toLowerCase()) === 0; });
      if (m.length === 1) input.value = m[0];
      e.preventDefault();
    }
  });
  document.addEventListener('keydown', function (e) {
    var typing = /INPUT|TEXTAREA/.test((e.target || {}).tagName);
    if (e.key === '`' && !typing) { e.preventDefault(); shell.hidden ? open() : close(); }
    else if (e.key === 'Escape' && !shell.hidden) close();
  });
})();
