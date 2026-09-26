import { Utils } from '../../utils/utils.js';
import { buildSlotHTML } from './slotRenderer.js';

const STATUS_MAP = {
  yes: ['power', 'power'],
  no: ['outage', 'outage'],
  first: ['outage', 'power'],
  second: ['power', 'outage']
};

export function buildHalfHourSlots(hoursData) {
  return Object.entries(hoursData).flatMap(([hour, value]) => {
    const base = (Number(hour) - 1) * 60;
    const [firstHalf, secondHalf] = STATUS_MAP[value] ?? ['power', 'power'];

    return [
      { start: base, end: base + 30, status: firstHalf },
      { start: base + 30, end: base + 60, status: secondHalf }
    ];
  });
}

export function mergeSlots(slots) {
  if (!slots.length) return [];

  return slots.slice(1).reduce((result, next) => {
    const current = result[result.length - 1];

    if (next.status === current.status && next.start === current.end) {
      current.end = next.end;
    } else {
      result.push({ ...next });
    }

    return result;
  }, [{ ...slots[0] }]);
}

export function renderDtekTable(factData, group, dayType) {
  if (!factData?.success || !group) {
    return { html: '', status: null, outageDates: [] };
  }

  const todayTimestamp = factData.data.today;
  const tomorrowTimestamp = todayTimestamp + 86400;
  if (todayTimestamp == null) {
    return { html: '', status: null, outageDates: [] };
  }

  const key = dayType === 'today' ? todayTimestamp : tomorrowTimestamp;
  const dayData = factData.data.data?.[key] ?? factData.data?.[key];

  if (!dayData) {
    return {
      html: '',
      status: 'ok',
      outageDates: []
    };
  }

  const groups = group === 'all'
    ? Object.keys(dayData).filter(keyName => keyName.startsWith('GPV'))
    : [`GPV${group}`];

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const outageDates = [];

  const html = groups.map(currentGroup => {
    if (!dayData[currentGroup]) return '';

    const slots = mergeSlots(buildHalfHourSlots(dayData[currentGroup]));

    // Timestamp selection remains intentionally aligned with the current DTEK data model.
    slots.forEach(slot => {
      if (slot.status !== 'outage') return;

      const baseTimestamp = dayType === 'today'
        ? todayTimestamp
        : tomorrowTimestamp;

      const slotTimestamp = Utils.minutesToDate(baseTimestamp, slot.start);
      if (slotTimestamp > now) outageDates.push(slotTimestamp);
    });

    return slots.map((slot, slotIndex) => buildSlotHTML({
      turn: group === 'all' ? currentGroup.replace('GPV', '') : null,
      start: slot.start,
      end: slot.end,
      isOutage: slot.status === 'outage',
      isOutdated: false,
      isNow: slot.start <= nowMin && nowMin < slot.end && dayType === 'today',
      slotIndex,
      size: slots.length
    })).filter(Boolean).join('');
  }).join('');

  if (dayType === 'today') {
    const tomorrowData = tomorrowTimestamp;

    if (tomorrowData) {
      groups.forEach(currentGroup => {
        if (!tomorrowData[currentGroup]) return;

        const slots = mergeSlots(buildHalfHourSlots(tomorrowData[currentGroup]));
        slots.forEach(slot => {
          if (slot.status === 'outage') {
            outageDates.push(Utils.minutesToDate(
              tomorrowTimestamp,
              slot.start
            ));
          }
        });
      });
    }
  }

  outageDates.sort((a, b) => a - b);
  return { html, outageDates };
}
