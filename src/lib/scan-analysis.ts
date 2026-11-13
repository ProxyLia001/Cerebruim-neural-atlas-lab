export type SignalSummary = {
  sourceName: string;
  format: "EDF" | "CSV";
  sampleCount: number;
  mean: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
  peakToPeak: number;
  samples: number[];
  channelLabel?: string;
  sampleRateHz?: number;
  rowsAnalyzed?: number;
  numericColumns?: number;
};

type RunningStats = {
  count: number;
  mean: number;
  m2: number;
  minimum: number;
  maximum: number;
  samples: number[];
};

function newStats(): RunningStats {
  return { count: 0, mean: 0, m2: 0, minimum: Infinity, maximum: -Infinity, samples: [] };
}

function addValue(stats: RunningStats, value: number): void {
  stats.count += 1;
  const delta = value - stats.mean;
  stats.mean += delta / stats.count;
  stats.m2 += delta * (value - stats.mean);
  stats.minimum = Math.min(stats.minimum, value);
  stats.maximum = Math.max(stats.maximum, value);
}

function finishStats(stats: RunningStats) {
  if (!stats.count) throw new Error("No numeric samples were found in this file.");
  return {
    sampleCount: stats.count,
    mean: stats.mean,
    standardDeviation: Math.sqrt(stats.m2 / stats.count),
    minimum: stats.minimum,
    maximum: stats.maximum,
    peakToPeak: stats.maximum - stats.minimum,
    samples: stats.samples,
  };
}

function sampleEvenly(values: number[], total: number): number[] {
  if (values.length <= 500) return values;
  const stride = values.length / 500;
  return Array.from({ length: 500 }, (_, i) => values[Math.min(values.length - 1, Math.floor(i * stride))] ?? 0);
}

function parseRow(line: string, separator: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i] ?? "";
    if (char === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === separator && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

export function analyzeCsvText(text: string, sourceName: string): { headers: string[]; rows: string[][]; total: number; summary: SignalSummary } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("This CSV needs a header and at least one data row.");
  const firstLine = lines[0] ?? "";
  const separator = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const all = lines.map((line) => parseRow(line, separator));
  const headers = (all[0] ?? []).map((header, index) => header || `Column ${index + 1}`);
  const rows = all.slice(1).filter((row) => row.length > 0);
  const columns = headers.map((label, index) => ({
    label,
    values: rows.map((row) => Number((row[index] ?? "").trim())).filter((value) => Number.isFinite(value) && (value !== 0 || rows.some((row) => (row[index] ?? "").trim() === "0"))),
  })).sort((a, b) => b.values.length - a.values.length);
  const selected = columns[0];
  if (!selected || selected.values.length === 0) throw new Error("No numeric CSV column was found to measure.");
  const stats = newStats();
  selected.values.forEach((value) => addValue(stats, value));
  stats.samples = sampleEvenly(selected.values, selected.values.length);
  return {
    headers,
    rows: rows.slice(0, 20),
    total: rows.length,
    summary: {
      sourceName,
      format: "CSV",
      ...finishStats(stats),
      channelLabel: selected.label,
      rowsAnalyzed: rows.length,
      numericColumns: columns.filter((column) => column.values.length > 0).length,
    },
  };
}

function field(header: string, start: number, end: number): string {
  return header.slice(start, end).trim();
}

function numField(header: string, start: number, end: number): number {
  const value = Number(field(header, start, end));
  return Number.isFinite(value) ? value : 0;
}

export function analyzeEdfBuffer(buffer: ArrayBuffer, sourceName: string): { props: Record<string, string>; summary: SignalSummary } {
  if (buffer.byteLength < 256) throw new Error("This file is too small to contain a valid EDF header.");
  const bytes = new Uint8Array(buffer);
  const fixedHeader = new TextDecoder("ascii").decode(bytes.subarray(0, 256));
  const channels = numField(fixedHeader, 252, 256);
  const declaredRecords = numField(fixedHeader, 236, 244);
  const recordDuration = numField(fixedHeader, 244, 252);
  const headerBytes = numField(fixedHeader, 184, 192);
  if (!Number.isInteger(channels) || channels < 1 || channels > 512 || headerBytes < 256 || headerBytes > bytes.length || recordDuration <= 0) {
    throw new Error("The EDF header is incomplete or invalid.");
  }
  const header = new TextDecoder("ascii").decode(bytes.subarray(0, headerBytes));
  const signalHeadersStart = 256;
  const labels = Array.from({ length: channels }, (_, i) => field(header, signalHeadersStart + i * 16, signalHeadersStart + (i + 1) * 16));
  const signalGroupOffset = (groupStart: number, fieldWidth: number, index: number) => signalHeadersStart + channels * groupStart + index * fieldWidth;
  const samplesPerRecord = Array.from({ length: channels }, (_, i) => numField(header, signalGroupOffset(216, 8, i), signalGroupOffset(216, 8, i) + 8));
  const channelIndex = labels.findIndex((label) => label && !/annotations/i.test(label));
  if (channelIndex < 0) throw new Error("No numeric EDF signal channel was found.");
  const perRecord = samplesPerRecord.reduce((sum, count) => sum + count, 0);
  const recordBytes = perRecord * 2;
  if (!recordBytes || headerBytes + recordBytes > bytes.length) throw new Error("EDF signal data is missing or incomplete.");
  const availableRecords = Math.floor((bytes.length - headerBytes) / recordBytes);
  const records = declaredRecords >= 0 ? Math.min(declaredRecords, availableRecords) : availableRecords;
  const channelSamples = samplesPerRecord[channelIndex] ?? 0;
  if (!records || !channelSamples) throw new Error("No EDF signal records were found.");
  const physicalMinimum = numField(header, signalGroupOffset(104, 8, channelIndex), signalGroupOffset(104, 8, channelIndex) + 8);
  const physicalMaximum = numField(header, signalGroupOffset(112, 8, channelIndex), signalGroupOffset(112, 8, channelIndex) + 8);
  const digitalMinimum = numField(header, signalGroupOffset(120, 8, channelIndex), signalGroupOffset(120, 8, channelIndex) + 8);
  const digitalMaximum = numField(header, signalGroupOffset(128, 8, channelIndex), signalGroupOffset(128, 8, channelIndex) + 8);
  if (physicalMaximum === physicalMinimum || digitalMaximum === digitalMinimum) throw new Error("The first EDF channel has invalid calibration values.");
  const scale = (physicalMaximum - physicalMinimum) / (digitalMaximum - digitalMinimum);
  const channelOffsetInRecord = samplesPerRecord.slice(0, channelIndex).reduce((sum, count) => sum + count, 0) * 2;
  const data = new DataView(buffer);
  const stats = newStats();
  const totalSamples = records * channelSamples;
  const stride = Math.max(1, Math.ceil(totalSamples / 500));
  let absoluteIndex = 0;
  for (let record = 0; record < records; record += 1) {
    const base = headerBytes + record * recordBytes + channelOffsetInRecord;
    for (let sample = 0; sample < channelSamples; sample += 1) {
      const digital = data.getInt16(base + sample * 2, true);
      const value = physicalMinimum + (digital - digitalMinimum) * scale;
      addValue(stats, value);
      if (absoluteIndex % stride === 0 && stats.samples.length < 500) stats.samples.push(value);
      absoluteIndex += 1;
    }
  }
  const sampleRateHz = channelSamples / recordDuration;
  return {
    props: {
      Format: field(fixedHeader, 0, 8).startsWith("0") ? "EDF" : "EDF/EDF+",
      Patient: field(fixedHeader, 8, 88) || "—",
      Recording: field(fixedHeader, 88, 168) || "—",
      "Start date": field(fixedHeader, 168, 176) || "—",
      "Start time": field(fixedHeader, 176, 184) || "—",
      Channels: String(channels),
      "Data records": String(records),
      "Record duration": `${recordDuration}s`,
      "Total duration": `${(records * recordDuration).toFixed(0)}s`,
      "Measured channel": labels[channelIndex] || `Channel ${channelIndex + 1}`,
      "Sampling rate": `${sampleRateHz.toFixed(2)} Hz`,
    },
    summary: {
      sourceName,
      format: "EDF",
      ...finishStats(stats),
      channelLabel: labels[channelIndex] || `Channel ${channelIndex + 1}`,
      sampleRateHz,
    },
  };
}