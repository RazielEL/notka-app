import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { alertNoteOccurrenceOverrides, alertNotes } from "@/db/schema";
import type {
  AlertNoteEditMode,
  AlertNoteOccurrenceDto,
  AlertNoteRecurrence,
} from "@/lib/types";
import { assertSafeId } from "@/lib/validation/ids";

const recurrenceValues = new Set<AlertNoteRecurrence>([
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);
const MAX_ALERT_TEXT_LENGTH = 280;
const MAX_GENERATED_OCCURRENCES = 5000;

type AlertNoteRow = typeof alertNotes.$inferSelect;
type AlertNoteOverrideRow = typeof alertNoteOccurrenceOverrides.$inferSelect;

type AlertNoteInput = {
  text?: unknown;
  scheduledAt?: unknown;
  timezone?: unknown;
  recurrence?: unknown;
  recurrenceEndAt?: unknown;
};

type AlertNoteOccurrenceInput = AlertNoteInput & {
  occurrenceAt?: unknown;
  mode?: unknown;
};

export async function listAlertNoteOccurrences(
  ownerUserId: string,
  input: {
    from?: unknown;
    to?: unknown;
    limit?: unknown;
  } = {},
): Promise<AlertNoteOccurrenceDto[]> {
  const now = new Date();
  const from = normalizeBoundaryDateTime(input.from, addDays(startOfDay(now), -7));
  const to = normalizeBoundaryDateTime(input.to, addMonths(startOfDay(now), 3));
  const limit = normalizeLimit(input.limit);

  if (to.getTime() <= from.getTime()) {
    throw new Error("Date range must end after it starts.");
  }

  const [noteRows, overrideRows] = await Promise.all([
    getDb()
      .select()
      .from(alertNotes)
      .where(eq(alertNotes.ownerUserId, ownerUserId))
      .orderBy(asc(alertNotes.startsAt)),
    getDb()
      .select()
      .from(alertNoteOccurrenceOverrides)
      .where(eq(alertNoteOccurrenceOverrides.ownerUserId, ownerUserId)),
  ]);
  const overridesByAlertNoteId = groupOverrides(overrideRows);
  const occurrences = noteRows.flatMap((note) =>
    expandAlertNoteOccurrences(
      note,
      overridesByAlertNoteId.get(note.id) ?? new Map(),
      from,
      to,
    ),
  );

  return occurrences
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.text.localeCompare(b.text))
    .slice(0, limit);
}

export async function createAlertNote(ownerUserId: string, input: AlertNoteInput) {
  const now = new Date().toISOString();
  const scheduledAt = normalizeRequiredDateTime(input.scheduledAt, "Alert note date");
  const recurrence = normalizeRecurrence(input.recurrence);
  const note = {
    id: randomUUID(),
    ownerUserId,
    text: normalizeAlertText(input.text),
    startsAt: scheduledAt,
    timezone: normalizeTimezone(input.timezone),
    recurrence,
    recurrenceEndAt:
      recurrence === "none"
        ? null
        : normalizeOptionalDateTime(input.recurrenceEndAt, "Recurrence end date"),
    createdAt: now,
    updatedAt: now,
  };

  validateRecurrenceEnd(note.startsAt, note.recurrenceEndAt);
  await getDb().insert(alertNotes).values(note);

  return noteToOccurrenceDto(note, note.startsAt, note.startsAt, note.text);
}

export async function updateAlertNoteOccurrence(
  ownerUserId: string,
  alertNoteIdInput: unknown,
  input: AlertNoteOccurrenceInput,
) {
  const alertNote = await getAlertNoteForUser(ownerUserId, alertNoteIdInput);
  const occurrenceAt = normalizeOccurrenceAt(input.occurrenceAt, alertNote);
  const mode = normalizeEditMode(input.mode, alertNote.recurrence);
  const scheduledAt = normalizeRequiredDateTime(input.scheduledAt, "Alert note date");
  const text = normalizeAlertText(input.text);
  const now = new Date().toISOString();

  if (mode === "current" && alertNote.recurrence !== "none") {
    await replaceOccurrenceOverride(ownerUserId, alertNote.id, occurrenceAt, {
      scheduledAt,
      text,
      cancelled: 0,
      now,
    });
    return { updatedId: alertNote.id };
  }

  if (mode === "future" && alertNote.recurrence !== "none") {
    await closeSeriesBeforeOccurrence(alertNote, occurrenceAt, now);

    const recurrence = normalizeRecurrence(input.recurrence, normalizeRecurrence(alertNote.recurrence));
    const recurrenceEndAt =
      recurrence === "none"
        ? null
        : normalizeOptionalDateTime(input.recurrenceEndAt, "Recurrence end date");
    const newAlertNote = {
      id: randomUUID(),
      ownerUserId,
      text,
      startsAt: scheduledAt,
      timezone: normalizeTimezone(input.timezone, alertNote.timezone),
      recurrence,
      recurrenceEndAt,
      createdAt: now,
      updatedAt: now,
    };

    validateRecurrenceEnd(newAlertNote.startsAt, newAlertNote.recurrenceEndAt);
    await getDb().insert(alertNotes).values(newAlertNote);

    return { updatedId: newAlertNote.id, splitFromId: alertNote.id };
  }

  const recurrence = normalizeRecurrence(input.recurrence, normalizeRecurrence(alertNote.recurrence));
  const recurrenceEndAt =
    recurrence === "none"
      ? null
      : normalizeOptionalDateTime(input.recurrenceEndAt, "Recurrence end date");

  validateRecurrenceEnd(scheduledAt, recurrenceEndAt);
  await getDb()
    .update(alertNotes)
    .set({
      text,
      startsAt: scheduledAt,
      timezone: normalizeTimezone(input.timezone, alertNote.timezone),
      recurrence,
      recurrenceEndAt,
      updatedAt: now,
    })
    .where(and(eq(alertNotes.id, alertNote.id), eq(alertNotes.ownerUserId, ownerUserId)))
    .run();

  return { updatedId: alertNote.id };
}

export async function deleteAlertNoteOccurrence(
  ownerUserId: string,
  alertNoteIdInput: unknown,
  input: {
    occurrenceAt?: unknown;
    mode?: unknown;
  } = {},
) {
  const alertNote = await getAlertNoteForUser(ownerUserId, alertNoteIdInput);
  const occurrenceAt = normalizeOccurrenceAt(input.occurrenceAt, alertNote);
  const mode = normalizeEditMode(input.mode, alertNote.recurrence);
  const now = new Date().toISOString();

  if (alertNote.recurrence === "none" || mode === "all") {
    await getDb()
      .delete(alertNotes)
      .where(and(eq(alertNotes.id, alertNote.id), eq(alertNotes.ownerUserId, ownerUserId)))
      .run();

    return { deletedId: alertNote.id };
  }

  if (mode === "future") {
    await closeSeriesBeforeOccurrence(alertNote, occurrenceAt, now);
    return { deletedId: alertNote.id, future: true };
  }

  await replaceOccurrenceOverride(ownerUserId, alertNote.id, occurrenceAt, {
    scheduledAt: null,
    text: null,
    cancelled: 1,
    now,
  });

  return { deletedId: alertNote.id, occurrenceAt };
}

async function getAlertNoteForUser(ownerUserId: string, alertNoteIdInput: unknown) {
  const alertNoteId = assertSafeId(alertNoteIdInput, "alert note id");
  const rows = await getDb()
    .select()
    .from(alertNotes)
    .where(and(eq(alertNotes.id, alertNoteId), eq(alertNotes.ownerUserId, ownerUserId)))
    .limit(1);
  const alertNote = rows[0];

  if (!alertNote) {
    throw new Error("Alert note not found.");
  }

  return alertNote;
}

function expandAlertNoteOccurrences(
  alertNote: AlertNoteRow,
  overrides: Map<string, AlertNoteOverrideRow>,
  from: Date,
  to: Date,
) {
  const recurrence = normalizeRecurrence(alertNote.recurrence);
  const startsAt = parseStoredDate(alertNote.startsAt);
  const recurrenceEndAt = alertNote.recurrenceEndAt
    ? parseStoredDate(alertNote.recurrenceEndAt)
    : null;
  const occurrences: AlertNoteOccurrenceDto[] = [];

  if (!startsAt) {
    return occurrences;
  }

  if (recurrence === "none") {
    const occurrence = occurrenceFromOverride(alertNote, alertNote.startsAt, overrides.get(alertNote.startsAt));

    if (occurrence && isInRange(occurrence.scheduledAt, from, to)) {
      occurrences.push(occurrence);
    }

    return occurrences;
  }

  let occurrenceDate = startsAt;
  let generated = 0;

  while (occurrenceDate.getTime() <= to.getTime() && generated < MAX_GENERATED_OCCURRENCES) {
    if (recurrenceEndAt && occurrenceDate.getTime() > recurrenceEndAt.getTime()) {
      break;
    }

    const occurrenceAt = occurrenceDate.toISOString();
    const occurrence = occurrenceFromOverride(alertNote, occurrenceAt, overrides.get(occurrenceAt));

    if (occurrence && isInRange(occurrence.scheduledAt, from, to)) {
      occurrences.push(occurrence);
    }

    occurrenceDate = addRecurrence(occurrenceDate, recurrence, startsAt.getDate());
    generated += 1;
  }

  return occurrences;
}

function occurrenceFromOverride(
  alertNote: AlertNoteRow,
  occurrenceAt: string,
  override: AlertNoteOverrideRow | undefined,
) {
  if (override?.cancelled === 1) {
    return null;
  }

  return noteToOccurrenceDto(
    alertNote,
    occurrenceAt,
    override?.scheduledAt ?? occurrenceAt,
    override?.text ?? alertNote.text,
    override?.updatedAt,
  );
}

function noteToOccurrenceDto(
  alertNote: AlertNoteRow,
  occurrenceAt: string,
  scheduledAt: string,
  text: string,
  updatedAt = alertNote.updatedAt,
): AlertNoteOccurrenceDto {
  const recurrence = normalizeRecurrence(alertNote.recurrence);

  return {
    id: `${alertNote.id}:${occurrenceAt}`,
    alertNoteId: alertNote.id,
    occurrenceAt,
    scheduledAt,
    text,
    timezone: alertNote.timezone,
    recurrence,
    recurrenceEndAt: alertNote.recurrenceEndAt,
    recurring: recurrence !== "none",
    createdAt: alertNote.createdAt,
    updatedAt,
  };
}

function groupOverrides(overrideRows: AlertNoteOverrideRow[]) {
  const grouped = new Map<string, Map<string, AlertNoteOverrideRow>>();

  for (const override of overrideRows) {
    const noteOverrides = grouped.get(override.alertNoteId) ?? new Map<string, AlertNoteOverrideRow>();
    noteOverrides.set(override.occurrenceAt, override);
    grouped.set(override.alertNoteId, noteOverrides);
  }

  return grouped;
}

async function replaceOccurrenceOverride(
  ownerUserId: string,
  alertNoteId: string,
  occurrenceAt: string,
  input: {
    scheduledAt: string | null;
    text: string | null;
    cancelled: 0 | 1;
    now: string;
  },
) {
  await getDb()
    .delete(alertNoteOccurrenceOverrides)
    .where(
      and(
        eq(alertNoteOccurrenceOverrides.alertNoteId, alertNoteId),
        eq(alertNoteOccurrenceOverrides.ownerUserId, ownerUserId),
        eq(alertNoteOccurrenceOverrides.occurrenceAt, occurrenceAt),
      ),
    )
    .run();

  await getDb()
    .insert(alertNoteOccurrenceOverrides)
    .values({
      id: randomUUID(),
      alertNoteId,
      ownerUserId,
      occurrenceAt,
      scheduledAt: input.scheduledAt,
      text: input.text,
      cancelled: input.cancelled,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .run();
}

async function closeSeriesBeforeOccurrence(alertNote: AlertNoteRow, occurrenceAt: string, now: string) {
  const endAt = new Date(new Date(occurrenceAt).getTime() - 1).toISOString();

  await getDb()
    .update(alertNotes)
    .set({
      recurrenceEndAt: endAt,
      updatedAt: now,
    })
    .where(and(eq(alertNotes.id, alertNote.id), eq(alertNotes.ownerUserId, alertNote.ownerUserId)))
    .run();
}

function normalizeAlertText(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Alert note text is required.");
  }

  const text = value.trim().replace(/\s+/g, " ");

  if (!text) {
    throw new Error("Alert note text is required.");
  }

  return text.slice(0, MAX_ALERT_TEXT_LENGTH);
}

function normalizeRecurrence(value: unknown, fallback: AlertNoteRecurrence = "none"): AlertNoteRecurrence {
  if (typeof value !== "string" || !recurrenceValues.has(value as AlertNoteRecurrence)) {
    return fallback;
  }

  return value as AlertNoteRecurrence;
}

function normalizeEditMode(value: unknown, recurrenceInput: unknown): AlertNoteEditMode {
  const recurrence = normalizeRecurrence(recurrenceInput);

  if (recurrence === "none") {
    return "all";
  }

  return value === "current" || value === "future" || value === "all" ? value : "current";
}

function normalizeRequiredDateTime(value: unknown, label: string) {
  const normalized = normalizeOptionalDateTime(value, label);

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalDateTime(value: unknown, label: string) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a date.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return parsed.toISOString();
}

function normalizeOccurrenceAt(value: unknown, alertNote: AlertNoteRow) {
  if (alertNote.recurrence === "none") {
    return alertNote.startsAt;
  }

  return normalizeRequiredDateTime(value, "Occurrence date");
}

function normalizeBoundaryDateTime(value: unknown, fallback: Date) {
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeLimit(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return 200;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(500, Math.max(1, Math.trunc(parsed))) : 200;
}

function normalizeTimezone(value: unknown, fallback = "UTC") {
  if (typeof value !== "string") {
    return fallback;
  }

  const timezone = value.trim();
  return timezone ? timezone.slice(0, 80) : fallback;
}

function validateRecurrenceEnd(startsAt: string, recurrenceEndAt: string | null) {
  if (!recurrenceEndAt) {
    return;
  }

  if (new Date(recurrenceEndAt).getTime() < new Date(startsAt).getTime()) {
    throw new Error("Recurrence end date must be after the start date.");
  }
}

function parseStoredDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInRange(value: string, from: Date, to: Date) {
  const time = new Date(value).getTime();
  return time >= from.getTime() && time <= to.getTime();
}

function addRecurrence(value: Date, recurrence: AlertNoteRecurrence, anchorDay: number) {
  if (recurrence === "daily") {
    return addDays(value, 1);
  }

  if (recurrence === "weekly") {
    return addDays(value, 7);
  }

  if (recurrence === "monthly") {
    return addMonthsClamped(value, 1, anchorDay);
  }

  if (recurrence === "yearly") {
    return addYearsClamped(value, 1, anchorDay);
  }

  return value;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, value.getDate());
}

function addMonthsClamped(value: Date, amount: number, anchorDay: number) {
  const year = value.getFullYear();
  const month = value.getMonth() + amount;
  const day = Math.min(anchorDay, daysInMonth(year, month));

  return new Date(
    year,
    month,
    day,
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds(),
  );
}

function addYearsClamped(value: Date, amount: number, anchorDay: number) {
  const year = value.getFullYear() + amount;
  const month = value.getMonth();
  const day = Math.min(anchorDay, daysInMonth(year, month));

  return new Date(
    year,
    month,
    day,
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds(),
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
