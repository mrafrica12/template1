/* ═══════════════════════════════════════════════════════════════
   Ocean Breeze Luxury Apartments — Booking Backend
   Google Apps Script  ·  Paste into your Apps Script project
   Deploy as Web App: Execute as Me · Anyone can access
═══════════════════════════════════════════════════════════════ */

var SHEET_NAME = 'Bookings';

/* ─── ROUTER ─────────────────────────────────────────────────── */
function doGet(e) {
  var action   = (e.parameter.action || '').toLowerCase();
  var callback = e.parameter.callback; // JSONP support

  var result;
  if      (action === 'createbooking') result = createBooking(e.parameter);
  else if (action === 'check')         result = checkAvailability(e.parameter.room, e.parameter.checkIn, e.parameter.checkOut);
  else if (action === 'bookeddates')   result = getBookedDates(e.parameter.room);
  else                                 result = { ok: false, error: 'Unknown action: ' + action };

  var json = JSON.stringify(result);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ─── SHEET SETUP ─────────────────────────────────────────────── */
function getOrCreateSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Ref', 'Room', 'Check-In', 'Check-Out',
      'Guest', 'Email', 'Phone', 'Nationality',
      'Guests', 'Nights', 'Rate', 'Total',
      'Payment Method', 'Status', 'Payment Status',
      'Requests', 'Notes', 'Submitted'
    ]);
    sheet.getRange(1, 1, 1, 18).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ─── CHECK AVAILABILITY ──────────────────────────────────────── */
function checkAvailability(room, checkIn, checkOut) {
  if (!room || !checkIn || !checkOut) {
    return { available: false, error: 'Missing parameters.' };
  }

  var sheet    = getOrCreateSheet();
  var data     = sheet.getDataRange().getValues();
  var roomNorm = room.toString().toLowerCase().trim();
  var ci       = new Date(checkIn  + 'T00:00:00');
  var co       = new Date(checkOut + 'T00:00:00');

  for (var i = 1; i < data.length; i++) {
    var row       = data[i];
    var rowRoom   = (row[1]  || '').toString().toLowerCase().trim();
    var rowStatus = (row[13] || '').toString().toLowerCase().trim();

    if (rowRoom   !== roomNorm)   continue;
    if (rowStatus === 'cancelled') continue;

    var existIn  = new Date(row[2]); existIn.setHours(0,0,0,0);
    var existOut = new Date(row[3]); existOut.setHours(0,0,0,0);

    // Overlap: new range overlaps existing if ci < existOut AND co > existIn
    if (ci < existOut && co > existIn) {
      return {
        available: false,
        message:   'This residence is already booked for some of your selected dates. Please choose different dates.'
      };
    }
  }
  return { available: true };
}

/* ─── CREATE BOOKING ──────────────────────────────────────────── */
function createBooking(params) {
  var room = (params.room || '').toLowerCase().trim();

  // Server-side availability guard — prevents race-condition double bookings
  var avail = checkAvailability(room, params.checkIn, params.checkOut);
  if (!avail.available) {
    return { ok: false, error: avail.message || 'Room not available for these dates.' };
  }

  // Honeypot spam check
  if (params.website && params.website.toString().trim() !== '') {
    return { ok: false, error: 'Spam detected.' };
  }

  var sheet = getOrCreateSheet();
  var ref   = 'OB-' + new Date().getFullYear() + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();

  sheet.appendRow([
    ref,
    room,
    params.checkIn        || '',
    params.checkOut       || '',
    params.guest          || '',
    params.email          || '',
    params.phone          || '',
    params.nationality    || '',
    params.guests         || '',
    params.nights         || '',
    params.rate           || '',
    params.total          || '',
    params.paymentMethod  || '',
    params.status         || 'Pending',
    params.payment        || 'Pending',
    params.requests       || '',
    params.notes          || '',
    new Date().toISOString()
  ]);

  return { ok: true, bookingRef: ref };
}

/* ─── GET BOOKED DATES FOR CALENDAR ──────────────────────────── */
function getBookedDates(room) {
  var sheet    = getOrCreateSheet();
  var data     = sheet.getDataRange().getValues();
  var roomNorm = room ? room.toString().toLowerCase().trim() : '';
  var result   = [];

  for (var i = 1; i < data.length; i++) {
    var row       = data[i];
    var rowRoom   = (row[1]  || '').toString().toLowerCase().trim();
    var rowStatus = (row[13] || '').toString().toLowerCase().trim();

    if (roomNorm && rowRoom !== roomNorm) continue;
    if (rowStatus === 'cancelled')        continue;
    if (!row[2] || !row[3])               continue;

    result.push({
      checkIn:  Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      checkOut: Utilities.formatDate(new Date(row[3]), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    });
  }

  return { ok: true, dates: result };
}
