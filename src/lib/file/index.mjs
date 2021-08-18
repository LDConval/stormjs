import FileStream from './stream.mjs';
import StormLib from '../stormlib.js';
import { LCIDToC, LCIDToJS } from '../lcid/index.mjs';

class File {
  constructor(handle) {
    this.handle = handle;
    this.data = null;

    this._name = null;
    this._pos = 0;
  }

  get name() {
    this._ensureHandle();

    if (!this._name) {
      this._name = new StormLib.Str(StormLib.MAX_PATH);
    }

    if (StormLib.SFileGetFileName(this.handle, this._name)) {
      return this._name.toJS();
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`File name could not be read (error ${errno})`);
    }
  }

  get pos() {
    return this._pos;
  }

  set pos(pos) {
    this._ensureHandle();

    const result = StormLib.SFileSetFilePointer(
      this.handle, pos, StormLib.NULLPTR, StormLib.FILE_BEGIN
    );

    if (result === StormLib.SFILE_INVALID_SIZE) {
      const errno = StormLib.GetLastError();
      throw new Error(`File pos could not be set (error ${errno})`);
    }

    this._pos = pos;
  }

  get size() {
    this._ensureHandle();

    const size = StormLib.SFileGetFileSize(this.handle, StormLib.NULLPTR);

    if (size === StormLib.SFILE_INVALID_SIZE) {
      const errno = StormLib.GetLastError();
      throw new Error(`File size could not be determined (error ${errno})`);
    }

    return size;
  }

  close() {
    if (this.handle) {
      if (StormLib.SFileCloseFile(this.handle)) {
        this.handle.delete();
        this.handle = null;

        if (this.data) {
          this.data.delete();
          this.data = null;
        }

        if (this._name) {
          this._name.delete();
          this._name = null;
        }
      } else {
        const errno = StormLib.GetLastError();
        throw new Error(`Archive could not be closed (error ${errno})`);
      }
    }
  }

  createStream() {
    this._ensureHandle();
    return new FileStream(this);
  }

  read() {
    this._ensureHandle();

    const size = this.size;

    if (!this.data) {
      this.data = new StormLib.Buf(size);
    }

    this.pos = 0;

    const success = StormLib.SFileReadFile(
      this.handle, this.data, size, StormLib.NULLPTR, StormLib.NULLPTR
    );

    if (success) {
      return this.data.toJS();
    } else {
      this.data.delete();
      this.data = null;

      const errno = StormLib.GetLastError();
      throw new Error(`File could not be read (error ${errno})`);
    }
  }

  setLocale(lcid) {
    this._ensureHandle();
    let lcidC = LCIDToC(lcid);
    if (StormLib.SFileSetFileLocale(this.handle, lcidC)) {
      return this;
    } else {
      const errno = StormLib.GetLastError();
      throw new Error(`Could not set file locale (error ${errno})`);
    }
  }

  _processInfoBuf(buf, len, classC) {
    const infoClassTypes = File.infoClassTypes;
    const infoType = infoClassTypes[classC];
    let bufAB = buf.toJS().slice(0, len);
    buf.delete();
    if (infoType == "i64") {
      return Array.from(new Uint32Array(bufAB.buffer));
    } else if (infoType == "i32" || infoType == "p") {
      return new Uint32Array(bufAB.buffer)[0];
    } else if (infoType == "lc") {
      return LCIDToJS(new Uint32Array(bufAB.buffer)[0]);
    } else if (infoType == "f") {
      let rawInfoReturns = new Uint32Array(bufAB.buffer)[0];
      let obj = {};
      if (classC == 53) {
        // double exclamation mark to convert number to boolean
        obj = {
          "implode" :     !!((rawInfoReturns & 0x00000100) !== 0),
          "compress" :    !!((rawInfoReturns & 0x00000200) !== 0),
          "encrypt" :     !!((rawInfoReturns & 0x00010000) !== 0),
          "fixKey" :      !!((rawInfoReturns & 0x00020000) !== 0),
          "singleUnit" :  !!((rawInfoReturns & 0x01000000) !== 0),
          "deleted" :     !!((rawInfoReturns & 0x02000000) !== 0),
          "sectorCRC" :   !!((rawInfoReturns & 0x04000000) !== 0),
          "0x10000000" :  !!((rawInfoReturns & 0x10000000) !== 0),
          "exists" :      !!((rawInfoReturns & 0x80000000) !== 0),
          "rawFlags" :    rawInfoReturns
        };
      }
      return obj;
    } else {
      return bufAB;
    }
  }

  _getInfo(infoClass, bufSize) {
    this._ensureHandle();
    const infoClasses = File.infoClasses;
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
        throw new Error(`Failed to get file info (error ${errno})`);
      } else {
        let lenNextCall = lenNeeded.toJS();
        lenNeeded.delete();
        return this._getInfo(infoClass, lenNextCall + 4);
      }
    }
  }

  getInfo(infoClass) {
    return this._getInfo(infoClass, 0);
  }

  _ensureHandle() {
    if (!this.handle) {
      throw new Error('Invalid handle');
    }
  }
}

File.infoClasses = {
  "patchChain" : 40,
  "fileEntry" : 41,
  "hashEntry" : 42,
  "hashIndex" : 43,
  "nameHash1" : 44,
  "nameHash2" : 45,
  "nameHash3" : 46,
  "locale" : 47,
  "fileIndex" : 48,
  "byteOffset" : 49,
  "fileTime" : 50,
  "fileSize" : 51,
  "compressedSize" : 52,
  "flags" : 53,
  "encryptionKey" : 54,
  "encryptionKeyRaw" : 55,
  "crc32" : 56,
};

File.infoClassTypes = [
  "s", "b", "i64", "b", "b", "i64", "i32", "b",
  "i64", "i64", "b", "p", "i64", "i64", "b", "p",
  "i64", "i64", "i32", "b", "i64", "i64", "i32", "b",
  "i64", "i64", "b", "i32", "i64", "i32", "b", "i64",
  "i32", "i32", "i32", "i32", "i32", "i32", "i32", "i32",
  // start here (40)
  "b", "b", "b", "i32", "i32", "i32", "i64", "lc",
  "i32", "i64", "i64", "i32", "i32", "f", "i32", "i32",
  "i32",
];

export default File;
