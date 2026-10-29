// Values shown alongside the guidance. Every function returns '' when the
// value is unavailable, so the page never shows placeholders or guesses.
function pad2(value) {
  return ('0' + value).slice(-2);
}

function clockText(time) {
  const date = time instanceof Date ? time : new Date(time);
  if (isNaN(date.getTime())) return '';
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

// GPS speed in m/s normalized to a whole km/h number. Samples under 0.5 km/h
// are standstill noise, not motion. A missing reading (no fix yet) returns
// null — Number(null) is 0, so it must be rejected before conversion.
function speedKmh(mps) {
  if (mps === null || mps === undefined) return null;
  const value = Number(mps);
  if (!isFinite(value) || value < 0) return null;
  const kmh = value * 3.6;
  return kmh < 0.5 ? 0 : Math.round(kmh);
}

module.exports = { clockText, speedKmh };
