// Notification-derived maneuver boundaries are heuristic: no route/step ID is available.
function meters(value) {
  const match = String(value || '').match(/^(\d+(?:\.\d+)?)\s*(米|m|公里|千米|km)$/i);
  return match ? Number(match[1]) * (/^(公里|千米|km)$/i.test(match[2]) ? 1000 : 1) : null;
}
function create() {
  let previous = null;
  let nearAlerted = false;
  return { update(packet) {
    if (!packet || packet.status === 'demo') return null;
    if (packet.status !== 'active') {
      const arrived = previous && packet.status === 'ended' && /已到达目的地|已到达终点/.test(packet.rawText);
      previous = null; nearAlerted = false;
      return arrived ? 'long' : null;
    }
    const distance = meters(packet.distance);
    const turn = packet.maneuver !== 'straight' && packet.maneuver !== 'unknown' && packet.maneuver !== 'arrive';
    const sameSession = previous && previous.session === packet.session;
    const changed = sameSession && previous.maneuver !== packet.maneuver;
    // A substantial distance reset after approaching a turn may be the next same-direction turn.
    const reset = sameSession && previous.distance !== null && distance !== null && previous.distance <= 50 && distance >= 100;
    if (!sameSession || changed || reset) nearAlerted = false;
    const near = turn && distance !== null && distance <= 50;
    // A new trip buzzes on its first guidance so the link is confirmed without looking at the band.
    const alert = !sameSession || (near && !nearAlerted) || (changed && turn && previous.maneuver !== 'unknown');
    if (near) nearAlerted = true;
    previous = { session: packet.session, maneuver: packet.maneuver, distance };
    return alert ? 'short' : null;
  } };
}
module.exports = { create, meters };
