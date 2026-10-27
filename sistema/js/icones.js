/* ==========================================================================
   ÍCONES DO SISTEMA (mesmo traço fino dos ícones do Elegance)
   Só acrescenta os que ainda não existem na página.
   ========================================================================== */
(function () {
  "use strict";
  var I = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "arrow-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
    "chevron-left": '<path d="M15 5l-7 7 7 7"/>',
    "chevron-right": '<path d="M9 5l7 7-7 7"/>',
    "chevron-down": '<path d="M5 9l7 7 7-7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>',
    "calendar-plus": '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.7 4.3-5.5 7.5-5.5s6.1 1.8 7.5 5.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c1.1-3.2 3.6-4.8 6.5-4.8s5.4 1.6 6.5 4.8"/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.9c2 .6 3.3 2.1 4 4.6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    whatsapp: '<path d="M4 20.5l1.3-4.1A8.3 8.3 0 1 1 8.2 19.2z"/><path d="M9 8.6c-.4 3.5 2.9 6.8 6.4 6.4l.7-1.6-2-1-.9.9a4.3 4.3 0 0 1-2.5-2.5l.9-.9-1-2z"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.7 1.6-1.5 0-1.2-1-1.6-1-2.6 0-1 .8-1.6 1.9-1.6H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z"/><g fill="currentColor" stroke="none"><circle cx="7.4" cy="11.6" r="1.25"/><circle cx="9.6" cy="7.4" r="1.25"/><circle cx="14.4" cy="7.2" r="1.25"/></g>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
    home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r=".9"/><circle cx="5" cy="12" r=".9"/><circle cx="5" cy="17" r=".9"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    shield: '<path d="M12 3l7 3v5.2c0 4.8-3.3 8.3-7 9.8-3.7-1.5-7-5-7-9.8V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4.5v4h-4"/>',
    flask: '<path d="M9.5 3.5h5M10.5 3.5v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5.5-9.5v-6"/><path d="M7.5 15h9"/>',
    foot: '<path d="M8.6 9.2c3.3-1 7.3-.2 8.2 2.6.8 2.4-1 4.3-1.8 6.6-.7 2-1.6 3.6-4.2 3.6-3 0-4.6-2.6-4.4-5.8.2-3.3-.9-6.1 2.2-7z"/><circle cx="8.4" cy="5.3" r="1.5"/><circle cx="11.6" cy="4.3" r="1.2"/><circle cx="14.3" cy="4.7" r="1"/><circle cx="16.4" cy="6" r=".9"/><circle cx="17.9" cy="7.9" r=".8"/>'
  };
  var html = "";
  Object.keys(I).forEach(function (k) {
    if (!document.getElementById("i-" + k)) html += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + I[k] + "</symbol>";
  });
  if (html) document.body.insertAdjacentHTML("afterbegin", '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + html + "</svg>");
})();
