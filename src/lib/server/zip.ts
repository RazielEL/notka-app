import "server-only";

export type ZipFile = {
  path: string;
  content: string | Buffer;
  modifiedAt?: Date;
};

const CRC32_TABLE = buildCrc32Table();
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_STORE_METHOD = 0;

export function createZipArchive(files: ZipFile[]) {
  const localFileParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = normalizeZipPath(file.path);
    const fileNameBytes = Buffer.from(fileName, "utf8");
    const content = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content;
    const crc = crc32(content);
    const modifiedAt = file.modifiedAt && !Number.isNaN(file.modifiedAt.getTime())
      ? file.modifiedAt
      : new Date();
    const { date, time } = toDosDateTime(modifiedAt);

    assertZip16Value(fileNameBytes.length, "ZIP file name");
    assertZip32Value(content.length, "ZIP file content");
    assertZip32Value(offset, "ZIP file offset");

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileNameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
    centralDirectoryHeader.writeUInt16LE(20, 4);
    centralDirectoryHeader.writeUInt16LE(20, 6);
    centralDirectoryHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralDirectoryHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
    centralDirectoryHeader.writeUInt16LE(time, 12);
    centralDirectoryHeader.writeUInt16LE(date, 14);
    centralDirectoryHeader.writeUInt32LE(crc, 16);
    centralDirectoryHeader.writeUInt32LE(content.length, 20);
    centralDirectoryHeader.writeUInt32LE(content.length, 24);
    centralDirectoryHeader.writeUInt16LE(fileNameBytes.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(offset, 42);

    localFileParts.push(localHeader, fileNameBytes, content);
    centralDirectoryParts.push(centralDirectoryHeader, fileNameBytes);
    offset += localHeader.length + fileNameBytes.length + content.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralDirectoryParts);
  const centralDirectorySize = centralDirectory.length;

  assertZip16Value(files.length, "ZIP file count");
  assertZip32Value(centralDirectoryOffset, "ZIP central directory offset");
  assertZip32Value(centralDirectorySize, "ZIP central directory size");

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localFileParts, centralDirectory, endOfCentralDirectory]);
}

function normalizeZipPath(filePath: string) {
  const segments = filePath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const normalized = segments.join("/");

  if (!normalized || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Invalid ZIP file path.");
  }

  return normalized;
}

function toDosDateTime(date: Date) {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | seconds,
  };
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrc32Table() {
  const table = new Uint32Array(256);

  for (let i = 0; i < table.length; i += 1) {
    let value = i;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  return table;
}

function assertZip32Value(value: number, label: string) {
  if (value > 0xffffffff) {
    throw new Error(`${label} is too large for ZIP export.`);
  }
}

function assertZip16Value(value: number, label: string) {
  if (value > 0xffff) {
    throw new Error(`${label} is too large for ZIP export.`);
  }
}
