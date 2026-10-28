# Vendored front-end libraries

Served from this folder; nothing is loaded from a CDN. Refresh with `scripts/vendor-download.sh`.

| Library | Version | Source | SHA-256 |
|---|---|---|---|
| W3.CSS (`w3css/w3.css`) | 5.01 (March 11 2026) | https://www.w3schools.com/w3css/5/w3.css | `b80528ef39146806b62f249b095c726b9930abd0d89280fb2fd1fabea8f80fcb` |
| W3.CSS colour themes (`w3css/w3-theme-*.css`, 22 files) | as published 2026-10-28 | https://www.w3schools.com/lib/w3-theme-&lt;name&gt;.css | green: `7cbb36c5e02791f1f85b56c1b6b721bb3fc76810800804751d117110fd926193` |
| W3.JS (`w3js/w3.js`) | 1.04 | https://www.w3schools.com/lib/w3.js | `949da2f355c761f73c3b782edd5b0cae00a491af7da5ac58159e4b5a78600035` |
| OpenLayers (`ol/ol.js`, `ol/ol.css`) | 10.11.0 | npm package `ol@10.11.0` (`dist/ol.js`, full build) – BSD-2-Clause, see `ol/LICENSE.md` | `a4e607e98b56846d543e2131161720845c7a80170d5f00aa2bc8b6c4e0f9194a` |

All W3Schools files were checked byte-for-byte against the published files (SHA-256) when they were added.
