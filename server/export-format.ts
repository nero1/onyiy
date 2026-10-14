/** Each part is frozen after capture; mutable records are read during its own
 * interval. The creation cutoff is eligibility, never historical field state. */
export function exportTemporal(cutoff: string, started: Date, completed: Date) {
  return {
    contract: 'creation-cutoff-live-values-v1',
    records_created_before: cutoff,
    capture_started_at: started.toISOString(),
    capture_completed_at: completed.toISOString(),
    single_point_in_time: false,
  } as const;
}

type ExportPayload = {
  format: string;
  section: string;
  part: number;
  captured_at: string;
  records_created_before: string;
  temporal?: ReturnType<typeof exportTemporal>;
  rows: Record<string, unknown>[];
};

function csvCell(value: unknown) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-[0-9]+(?:\.[0-9]+)?$/.test(text))) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function withExportTemporal(payload: ExportPayload) {
  // Older retained parts also expose their actual timing guarantee. An empty
  // part still gets one metadata record, so its cutoff cannot disappear in CSV.
  const temporal = payload.temporal ?? {
    contract: 'creation-cutoff-live-values-v1',
    records_created_before: payload.records_created_before,
    capture_started_at: payload.captured_at,
    capture_completed_at: null,
    single_point_in_time: false,
  };
  return { ...payload, temporal };
}

export function ownExportCsv(payload: ExportPayload) {
  const { temporal } = withExportTemporal(payload);
  const metadata = {
    export_format: payload.format,
    export_section: payload.section,
    export_part: payload.part,
    ...temporal,
  };
  const keys = Array.from(new Set(payload.rows.flatMap(row => Object.keys(row))));
  const columns = ['record_type', ...Object.keys(metadata), ...keys];
  const records: Record<string, unknown>[] = [
    { record_type: 'metadata', ...metadata },
    ...payload.rows.map(row => ({ ...row, record_type: 'data', ...metadata })),
  ];
  return [columns.map(csvCell).join(','), ...records.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
}
