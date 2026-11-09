/**
 * release-version.js — Fetch latest GitHub Releases automatically
 * Updates version badges and direct download links across landing pages.
 */
(function () {
  'use strict';

  var REPOS = {
    studio: {
      repo: 'nexora-ctrl/nexora-studio',
      fallbackTag: 'v0.9.0',
      badgeIds: ['studio-version-badge', 'studio-version-tag'],
      mockTitleIds: ['studio-mock-title'],
      descIds: ['studio-cta-desc'],
      dlIds: ['studio-hero-dl', 'studio-cta-dl', 'studio-index-dl']
    },
    finder: {
      repo: 'nexora-ctrl/nexora-finder',
      fallbackTag: 'v0.4.0-beta',
      badgeIds: ['finder-version-badge', 'finder-version-tag'],
      mockTitleIds: ['finder-mock-title'],
      descIds: ['finder-cta-desc'],
      dlIds: ['finder-hero-dl', 'finder-cta-dl', 'finder-install-dl', 'finder-index-dl']
    }
  };

  function updateUi(key, tag, directUrl) {
    var conf = REPOS[key];
    if (!conf) return;

    // Badges / pills
    conf.badgeIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        var dot = el.querySelector('.pill-dot');
        if (dot) {
          el.innerHTML = '';
          el.appendChild(dot);
          el.appendChild(document.createTextNode(tag));
        } else {
          el.textContent = tag;
        }
      }
    });

    // Mock title if present
    if (conf.mockTitleIds) {
      conf.mockTitleIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          if (key === 'studio') {
            el.textContent = 'NEXORA Studio — ' + tag;
          } else if (key === 'finder') {
            el.innerHTML = 'Nexora Finder &middot; ' + tag;
          }
        }
      });
    }

    // CTA description if present
    if (conf.descIds) {
      conf.descIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.textContent = 'Unduh rilis ' + tag + ' gratis sekarang juga dan nikmati pengalaman desktop native yang ringan di Windows Anda.';
        }
      });
    }

    // Direct download links (fallback to release page or direct .exe asset)
    if (directUrl && conf.dlIds) {
      conf.dlIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.setAttribute('href', directUrl);
        }
      });
    }
  }

  function fetchLatestRelease(key) {
    var conf = REPOS[key];
    if (!conf) return;

    var cacheKey = 'nexora-rel-' + key;
    var cached = null;
    try {
      var raw = localStorage.getItem(cacheKey);
      if (raw) {
        var data = JSON.parse(raw);
        // Cache valid for 30 minutes
        if (Date.now() - data.ts < 30 * 60 * 1000 && data.tag) {
          cached = data;
        }
      }
    } catch (e) {}

    if (cached) {
      updateUi(key, cached.tag, cached.directUrl);
      return;
    }

    // GitHub releases API
    var apiUrl = 'https://api.github.com/repos/' + conf.repo + '/releases';
    fetch(apiUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (releases) {
        if (!Array.isArray(releases) || releases.length === 0) return;
        var latest = releases[0];
        var tag = latest.tag_name || conf.fallbackTag;
        var directUrl = latest.html_url || ('https://github.com/' + conf.repo + '/releases');

        // Check if there's an .exe asset
        if (latest.assets && latest.assets.length > 0) {
          for (var i = 0; i < latest.assets.length; i++) {
            var name = latest.assets[i].name || '';
            if (name.toLowerCase().endsWith('.exe')) {
              directUrl = latest.assets[i].browser_download_url;
              break;
            }
          }
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            tag: tag,
            directUrl: directUrl,
            ts: Date.now()
          }));
        } catch (e) {}

        updateUi(key, tag, directUrl);
      })
      .catch(function () {
        // Silently keep default fallback
      });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fetchLatestRelease('studio');
      fetchLatestRelease('finder');
    });
  } else {
    fetchLatestRelease('studio');
    fetchLatestRelease('finder');
  }
})();

