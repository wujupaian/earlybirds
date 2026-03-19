import { addDays, addMinutes, formatISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Checkin } from "./types";

export const DEPOSIT_LAMPORTS = 100_000_000;
export const CHECKIN_OPEN = "04:59:00";
export const CHECKIN_CLOSE = "05:01:00";

export function getNextChallengeStartUtc(nowUtc: Date, timezone: string): Date {
  const localNow = toZonedTime(nowUtc, timezone);
  const localDate = formatInTimeZone(localNow, timezone, "yyyy-MM-dd");
  const nextLocalStart = `${localDate} 05:00:00`;
  const sameDayStartUtc = fromZonedTime(nextLocalStart, timezone);

  if (sameDayStartUtc.getTime() > nowUtc.getTime()) {
    return sameDayStartUtc;
  }

  const nextDayLocal = formatInTimeZone(addDays(localNow, 1), timezone, "yyyy-MM-dd");
  return fromZonedTime(`${nextDayLocal} 05:00:00`, timezone);
}

export function getChallengeEndUtc(startUtc: Date): Date {
  return addMinutes(addDays(startUtc, 7), 1);
}

export function isValidCheckinTime(serverUtcNow: Date, userTimezone: string): boolean {
  const local = toZonedTime(serverUtcNow, userTimezone);
  const timeText = formatInTimeZone(local, userTimezone, "HH:mm:ss");
  return timeText >= CHECKIN_OPEN && timeText <= CHECKIN_CLOSE;
}

export function getChallengeDayNumber(startUtc: Date, currentUtc: Date, timezone: string): number {
  const localStart = formatInTimeZone(startUtc, timezone, "yyyy-MM-dd");
  const localNow = formatInTimeZone(currentUtc, timezone, "yyyy-MM-dd");
  const startDay = new Date(`${localStart}T00:00:00Z`);
  const currentDay = new Date(`${localNow}T00:00:00Z`);
  const diff = Math.round((currentDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
  return Math.min(7, Math.max(1, diff));
}

export function buildCheckins(challengeId: string, startUtc: Date, timezone: string): Checkin[] {
  return Array.from({ length: 7 }, (_, index) => {
    const localDate = formatInTimeZone(addDays(startUtc, index), timezone, "yyyy-MM-dd");
    return {
      id: `${challengeId}-day-${index + 1}`,
      challengeId,
      dayNumber: index + 1,
      checkDate: localDate,
      checkedIn: false,
      createdAt: formatISO(new Date()),
    };
  });
}

