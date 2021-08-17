import File from './file/index.mjs';
import StormLib from './stormlib.js';
import { LCIDToC, LCIDToJS } from './lcid/index.mjs';

class MPQ {
  constructor(handle, fp = "") {
    this.handle = handle;
    this.filePath = fp;
  }

  close() {
    if (this.handle) {
      if (StormLib.SFileCloseArchive(this.handle)) {
        this.handle.delete();
        this.handle = null;
      } else {
        const errno = StormLib.GetLastError();
        throw new Error(`Archive could not be closed (error ${errno})`);
      }
    }
  }

  hasFile(fileName) {
    this._ensureHandle();

    if (StormLib.SFileHasFile(this.handle, fileName)) {
      return true;
    } else {
      const errno = StormLib.GetLastError();

      if (errno === StormLib.ERROR_FILE_NOT_FOUND) {
        return false;
      } else {
        throw new Error(`File presence check failed (error ${errno})`);
      }
    }
  }

  openFile(fileName) {
    this._ensureHandle();

    const fileHandle = new StormLib.VoidPtr();

    if (StormLib.SFileOpenFileEx(this.handle, fileName, 0, fileHandle)) {
      return new File(fileHandle);
    } else {
      fileHandle.delete();

      const errno = StormLib.GetLastError();
      throw new Error(`File could not be opened (error ${errno})`);
    }
  }

  patch(path, prefix = '') {
    this._ensureHandle();

    if (!StormLib.SFileOpenPatchArchive(this.handle, path, prefix, 0)) {
      const errno = StormLib.GetLastError();
      throw new Error(`Patch failed (error ${errno})`);
    } else {
      return this;
    }
  }

  search(mask, listfile = '') {
    this._ensureHandle();

    const findData = new StormLib.SFileFindData();

    const findHandle = StormLib.SFileFindFirstFile(this.handle, mask, findData, listfile);

    if (findHandle.isNull()) {
      const errno = StormLib.GetLastError();

      findData.delete();
      findHandle.delete();

      if (errno === StormLib.ERROR_NO_MORE_FILES) {
        return [];
      } else {
        throw new Error(`Find failed (error ${errno})`);
      }
    }

    const results = [];

    results.push(findData.toJS());

    while (StormLib.SFileFindNextFile(findHandle, findData)) {
      results.push(findData.toJS());
    }

    StormLib.SFileFindClose(findHandle);

    findData.delete();
    findHandle.delete();

    return results;
  }

  compact(listfile = "") {
    this._ensureHandle();

    if (StormLib.SFileCompactArchive(this.handle, listfile, 0)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to compact archive (error ${errno})`);
    }
  }

  addListfile(listfile) {
    this._ensureHandle();

    if (StormLib.SFileAddListFile(this.handle, listfile)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to add listfile (error ${errno})`);
    }
  }

  sign() {
    this._ensureHandle();

    // "Currently, only SIGNATURE_TYPE_WEAK is supported." from StormLib docs
    if (StormLib.SFileSignArchive(this.handle, 0x1)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to add signature (error ${errno})`);
    }
  }

  flush() {
    this._ensureHandle();
    if (StormLib.SFileFlushArchive(this.handle)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to flush archive (error ${errno})`);
    }
  }

  setMaxFiles(maxCount) {
    this._ensureHandle();
    if (maxCount < StormLib.HASH_TABLE_SIZE_MIN || maxCount > StormLib.HASH_TABLE_SIZE_MAX) {
      throw new Error(`Max file count must be in range ${StormLib.HASH_TABLE_SIZE_MIN} - ${StormLib.HASH_TABLE_SIZE_MAX}`);
    }
    if (StormLib.SFileSetMaxFileCount(this.handle, maxCount)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to set max file count (error ${errno})`);
    }
  }

  isPatched() {
    this._ensureHandle();
    return !!StormLib.SFileIsPatchedArchive(this.handle);
  }

  toArrayBuffer() {
    this._ensureHandle();
    this.flush();
    let path = this.filePath;
    return StormLib.FS.readFile(path);
  }

  removeFile(fileName) {
    this._ensureHandle();
    if (StormLib.SFileRemoveFile(this.handle, fileName, 0)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to remove file (error ${errno})`);
    }
  }

  extractFile(fileNameInMpq, fileNameInFS) {
    this._ensureHandle();
    if (StormLib.SFileExtractFile(this.handle, fileNameInMpq, fileNameInFS, 0)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to extract file (error ${errno})`);
    }
  }

  verify() {
    this._ensureHandle();
    let retCode = StormLib.SFileVerifyArchive(this.handle);
    if (retCode % 2 == 0) {
      // if there is no signature, verification always passes.
      return this;
    } else {
      throw new Error(`Verification failed with status ${retCode}`);
    }
  }

  verifyStatus() {
    this._ensureHandle();
    return StormLib.SFileVerifyArchive(this.handle);
  }

  _verifyFileFlags(arg) {
    if (typeof(arg) === 'number') {
      return arg;
    } else if (typeof(arg) === 'undefined') {
      return 0xF;
    } else {
      return (arg.sectorCRC ? 0x1 : 0)
           | (arg.fileCRC ? 0x2 : 0)
           | (arg.fileMD5 ? 0x4 : 0)
           | (arg.rawMD5 ? 0x8 : 0);
    }
  }

  verifyFile(fileName, flags) {
    this._ensureHandle();
    let retCode = StormLib.SFileVerifyFile(this.handle, fileName, this._verifyFileFlags(flags));
    if ((retCode & 0x2AB) == 0) {
      return this;
    } else {
      throw new Error(`File verification failed with status ${retCode}`);
    }
  }

  verifyFileStatus(fileName, flags) {
    this._ensureHandle();
    return StormLib.SFileVerifyFile(this.handle, fileName, this._verifyFileFlags(flags));
  }

  _addFileFlags(arg) {
    if (typeof(arg) === 'number') {
      return arg;
    } else if (typeof(arg) === 'undefined') {
      return 0x80010200;
    } else {
      return ((arg.implode     ? 0x00000100 : 0)
            | (arg.compress    ? 0x00000200 : 0)
            | (arg.compression ? 0x00000200 : 0)
            | (arg.encrypt     ? 0x00010000 : 0)
            | (arg.fixKey      ? 0x00020000 : 0)
            | (arg.singleUnit  ? 0x01000000 : 0)
            | (arg.deleted     ? 0x02000000 : 0)
            | (arg.sectorCRC   ? 0x04000000 : 0))
            + (arg.replace     ? 0x80000000 : 0); // because it will give a negative value otherwise
    }
  }

  _attributeFlags(arg) {
    if (typeof(arg) === 'number') {
      return arg;
    } else if (typeof(arg) === 'undefined') {
      return 0;
    } else {
      return (arg.crc32    ? 0x1 : 0)
           | (arg.time     ? 0x2 : 0)
           | (arg.md5      ? 0x4 : 0)
           | (arg.patchBit ? 0x8 : 0);
    }
  }

  _compression(arg) {
    const compressionTypes = {
      "huffman"     : 0x1,
      "zlib"        : 0x2,
      "pkware"      : 0x8,
      "bzip2"       : 0x10,
      "lzma"        : 0x12,
      "sparse"      : 0x20,
      "adpcmMono"   : 0x40,
      "adpcmStereo" : 0x80,
    };
    if (typeof(arg) === 'number') {
      return arg;
    } else if (typeof(arg) === 'undefined') {
      return 0x8;
    } else if (arg.length && arg.map && arg.reduce) {
      return arg.map(n => {
        if (!compressionTypes[n]) {
          throw new Error(`unrecognized compression type: ${n}`);
        }
        return compressionTypes[n];
      }).reduce((s,a) => s | a, 0);
    } else {
      if (!compressionTypes[arg]) {
        throw new Error(`unrecognized compression type: ${arg}`);
      }
      return compressionTypes[arg];
    }
  }

  addFile(fileNameInFS, fileNameInMpq, flags, compress, compressNext) {
    this._ensureHandle();
    if (typeof(fileNameInMpq) !== "string") {
      flags = fileNameInMpq;
      fileNameInMpq = fileNameInFS;
      compress = undefined;
      compressNext = undefined;
    }
    let compHead = compress ?? this._compression(flags && (flags.compressionHeader ?? flags.compression));
    let compNext = compressNext ?? compress ?? this._compression(flags && flags.compression);
    let addFileFlags = this._addFileFlags(flags);
    if (StormLib.SFileAddFileEx(this.handle, fileNameInFS, fileNameInMpq, addFileFlags, compHead, compNext)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to add file (error ${errno})`);
    }
  }

  addFileFromArrayBuffer(fileName, ab, flags) {
    let fsFileName = (flags && flags.fsFileName) || `temp_${new Date().valueOf()}.xxx`;
    let uint8ab = new Uint8Array(ab.buffer ?? ab);
    StormLib.FS.writeFile(fsFileName, uint8ab);
    let result;
    try {
      result = this.addFile(fsFileName, fileName, flags);
    }
    finally {
      StormLib.FS.unlink(fsFileName);
    }
    return result;
  }

  renameFile(fileName, newName) {
    this._ensureHandle();
    if (StormLib.SFileRenameFile(this.handle, fileName, newName)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Failed to rename file (error ${errno})`);
    }
  }

  _processInfoBuf(buf, len, classC) {
    const infoClassTypes = MPQ.infoClassTypes;
    const infoType = infoClassTypes[classC];
    let bufAB = buf.toJS().slice(0, len);
    if (infoType == "i64") {
      return Array.from(new Uint32Array(bufAB.buffer));
    } else if (infoType == "i32" || infoType == "p") {
      return new Uint32Array(bufAB.buffer)[0];
    } else if (infoType == "s") {
      let td = new TextDecoder();
      return td.decode(bufAB).replace(/\x00$/, "");
    } else {
      return bufAB;
    }
  }

  _getInfo(infoClass, bufSize) {
    this._ensureHandle();
    const infoClasses = MPQ.infoClasses;
    const size = bufSize || 12;
    let buf = new StormLib.Buf(size);
    let lenNeeded = new StormLib.Uint32Ptr();
    let infoClassC = typeof(infoClass) === "number" ? infoClass : infoClasses[infoClass];

    if (StormLib.SFileGetFileInfo(this.handle, infoClassC, buf, size, lenNeeded)) {
      let lenReturned = lenNeeded.toJS();
      lenNeeded.delete();
      return this._processInfoBuf(buf, lenReturned, infoClassC);
    } else {
      const errno = StormLib.GetLastError();
      if (errno != StormLib.ERROR_INSUFFICIENT_BUFFER || bufSize > 0) {
        buf.delete();
        lenNeeded.delete();
        throw new Error(`Failed to get archive info (error ${errno})`);
      } else {
        buf.delete();
        let lenNextCall = lenNeeded.toJS();
        lenNeeded.delete();
        return this._getInfo(infoClass, lenNextCall + 4);
      }
    }
  }

  getInfo(infoClass) {
    return this._getInfo(infoClass, 0);
  }

  readFile(fileName, encoding) {
    this._ensureHandle();
    let fileHandle = this.openFile(fileName);

    // fileHandle.read() will result in a buffer which, unlike normally
    // fetched / read arraybuffer from files, directly points at the file
    // section in the Emscripten buffer. It is necessary to copy the
    // buffer or the pointer data may get garbage collected by Emscripten
    // which consequentially corrupts the data.
    let buf = fileHandle.read().slice(0);
    fileHandle.close();

    if (typeof(encoding) === "string") {
      let td = new TextDecoder(encoding);
      return td.decode(buf);
    } else {
      return buf;
    }
  }

  getFileInfo(fileName, infoClass) {
    this._ensureHandle();
    let fileHandle = this.openFile(fileName);
    let retval = fileHandle.getInfo(infoClass);
    fileHandle.close();
    return retval;
  }

  locale(lcid) {
    if (typeof(lcid) === "undefined") {
      return MPQ.locale(lcid);
    }
    MPQ.locale(lcid);
    return this;
  }

  _ensureHandle() {
    if (!this.handle) {
      throw new Error('Invalid handle');
    }
  }

  static locale(lcid) {
    if (typeof(lcid) === "undefined") {
      return LCIDToJS(StormLib.SFileGetLocale());
    } else {
      let lcidConv = LCIDToC(lcid);
      StormLib.SFileSetLocale(lcidConv);
      return LCIDToJS(lcidConv);
    }
  }

  static async fromArrayBuffer(ab, mpqName = `mpq_${new Date().valueOf()}.mpq`, mode) {
    await StormLib.ready;
    if (typeof(mpqName) === 'object') {
      if (typeof(mode) !== 'undefined') {
        throw new Error('Invalid parameter combination for MPQ.fromArrayBuffer');
      }
      mode = mpqName;
      mpqName = mode.name ?? mode.mpqName ?? `mpq_${new Date().valueOf()}.mpq`;
    }
    let uint8ab = new Uint8Array(ab.buffer ?? ab);
    StormLib.FS.writeFile(mpqName, uint8ab);
    return MPQ.open(mpqName, mode);
  }

  static async open(path, mode = '') {
    await StormLib.ready;

    let flags = 0;

    if (typeof(mode) === "number") {
      flags = mode;
    } else if (typeof(mode) === "object") {
      flags = (mode.readOnly       ? 0x100 : 0)
            | (mode.partial        ? 0x10 : 0)
            | (mode.mpqe           ? 0x20 : 0)
            | (mode.block4         ? 0x30 : 0)
            | (mode.useBitmap      ? 0x400 : 0)
            | (mode.noListfile     ? 0x10000 : 0)
            | (mode.noAttributes   ? 0x20000 : 0)
            | (mode.noHeaderSearch ? 0x40000 : 0)
            | (mode.forceMpqV1     ? 0x80000 : 0)
            | (mode.checkSectorCRC ? 0x100000 : 0);
    } else if (mode === 'r') {
      flags |= StormLib.STREAM_FLAG_READ_ONLY;
    }

    const handle = new StormLib.VoidPtr();
    const priority = 0;

    if (StormLib.SFileOpenArchive(path, priority, flags, handle)) {
      return new MPQ(handle, path);
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Archive could not be opened (error ${errno})`);
    }
  }

  static async create(path, createOptionsOrFlags, maxFiles = 1000) {
    await StormLib.ready;

    const handle = new StormLib.VoidPtr();

    if (typeof(createOptionsOrFlags) === 'number') {
      if (maxFiles < StormLib.HASH_TABLE_SIZE_MIN || maxFiles > StormLib.HASH_TABLE_SIZE_MAX) {
        throw new Error(`Max file count must be in range ${StormLib.HASH_TABLE_SIZE_MIN} - ${StormLib.HASH_TABLE_SIZE_MAX}`);
      }
      if (StormLib.SFileCreateArchive(path, createOptionsOrFlags, maxFiles, handle)) {
        return new MPQ(handle, path);
      } else {
        const errno = StormLib.GetLastError();
        throw new Error(`Archive could not be created (error ${errno})`);
      }
    } else if (typeof(createOptionsOrFlags) === 'object') {
      let opt = createOptionsOrFlags;
      let optFilled = {
        "cbSize"         : opt.headerSize ?? 0,
        "dwMpqVersion"   : (opt.version ?? 1) - 1,
        "dwStreamFlags"  : opt.streamFlags ?? 0,
        "dwFileFlags1"   : MPQ.prototype._addFileFlags(opt.fileFlagsListfile),
        "dwFileFlags2"   : MPQ.prototype._addFileFlags(opt.fileFlagsAttributes),
        "dwFileFlags3"   : MPQ.prototype._addFileFlags(opt.fileFlagsSignature),
        "dwAttrFlags"    : MPQ.prototype._attributeFlags(opt.attributeFlags),
        "dwSectorSize"   : opt.sectorSize ?? 0x1000,
        "dwRawChunkSize" : opt.rawChunkSize ?? 0,
        "dwMaxFileCount" : opt.maxFiles ?? 1000,
      };
      if (StormLib.SFileCreateArchive2(path, optFilled, handle)) {
        return new MPQ(handle, path);
      } else {
        const errno = StormLib.GetLastError();
        throw new Error(`Archive could not be created (error ${errno})`);
      }
    } else {
      if (StormLib.SFileCreateArchive2(path, {
        "cbSize"         : 0,
        "dwMpqVersion"   : 0,
        "dwStreamFlags"  : 0,
        "dwFileFlags1"   : 0x80010200,
        "dwFileFlags2"   : 0,
        "dwFileFlags3"   : 0,
        "dwAttrFlags"    : 0,
        "dwSectorSize"   : 0x1000,
        "dwRawChunkSize" : 0,
        "dwMaxFileCount" : 1000,
      }, handle)) {
        return new MPQ(handle, path);
      } else {
        const errno = StormLib.GetLastError();
        throw new Error(`Archive could not be created (error ${errno})`);
      }
    }
  }
}

MPQ.infoClassTypes = [
  "s", "b", "i64", "b", "b", "i64", "i32", "b",
  "i64", "i64", "b", "p", "i64", "i64", "b", "p",
  "i64", "i64", "i32", "b", "i64", "i64", "i32", "b",
  "i64", "i64", "b", "i32", "i64", "i32", "b", "i64",
  "i32", "i32", "i32", "i32", "i32", "i32", "i32", "i32",
  // end here (the rest are for files)
  "b", "b", "b", "i32", "i32", "i32", "i64", "lc",
  "i32", "i64", "i64", "i32", "i32", "f", "i32", "i32",
  "i32",
];

MPQ.infoClasses = {
  "fileName" : 0,
  "mpqName" : 0,
  "name" : 0,
  "streamBitmap" : 1,
  "userDataOffset" : 2,
  "userDataHeader" : 3,
  "userData" : 4,
  "headerOffset" : 5,
  "headerSize" : 6,
  "header" : 7,
  "hetTableOffset" : 8,
  "hetTableSize" : 9,
  "hetHeader" : 10,
  "hetTable" : 11,
  "betTableOffset" : 12,
  "betTableSize" : 13,
  "betHeader" : 14,
  "betTable" : 15,
  "hashTableOffset" : 16,
  "hashTableSize64" : 17,
  "hashTableSize" : 18,
  "hashTable" : 19,
  "blockTableOffset" : 20,
  "blockTableSize64" : 21,
  "blockTableSize" : 22,
  "blockTable" : 23,
  "hiBlockTableOffset" : 24,
  "hiBlockTableSize64" : 25,
  "hiBlockTable" : 26,
  "signatures" : 27,
  "strongSignatureOffset" : 28,
  "strongSignatureSize" : 29,
  "strongSignature" : 30,
  "archiveSize64" : 31,
  "archiveSize" : 32,
  "maxFileCount" : 33,
  "fileTableSize" : 34,
  "sectorSize" : 35,
  "numberOfFiles" : 36,
  "rawChunkSize" : 37,
  "streamFlags" : 38,
  "flags" : 39,
};

export default MPQ;
