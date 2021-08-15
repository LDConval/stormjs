# StormJS APIs

## File System

StormJS uses the file system provided by Emscripten.

TL;DR, for Node environment:

```js
FS.mkdir('/stormjs');
FS.mount(FS.filesystems.NODEFS, { root: '/path/to/local/dir' }, '/stormjs');
```

This will mount a local path to `/stormjs` in the virtual FS; you can then use file operations on the path as usual.

For other environments such as browsers:

```js
FS.mkdir('/path');
const fileArrayBuffer = FS.readFile('/path/file.xxx');
FS.writeFile('/path/file.xxx', fileArrayBuffer);
```

For additional information, please refer to https://emscripten.org/docs/api_reference/Filesystem-API.html .

## Create or open MPQs

#### **async** MPQ.open( path, [ mode ])

Opens an MPQ archive.

- path: string; The path to the MPQ file in the virtual file system.
- mode: optional; can be one of these types
  - number: raw uint32 flag value for StormLib
  - string: 'r' for readOnly
  - object: an object containing the following flags
    - partial: boolean; file is a partial MPQ, used in certain game files
    - mpqe: boolean; file is encrypted
    - block4: boolean
    - readOnly: boolean; file is read only
    - useBitmap: boolean
    - noListfile: boolean; do not read (listfile)
    - noAttributes: boolean; do not read (attributes)
    - noHeaderSearch: boolean
    - forceMpqV1: boolean; forces StormLib to open MPQ as v1 format, may work on some protected WarcraftIII maps
    - checkSectorCRC: boolean; checks sector CRC each time reading a file
- returns: object; MPQ instance

#### **async** MPQ.fromArrayBuffer( buffer, [ mode ])

Opens an MPQ archive provided by an ArrayBuffer. Creates an MPQ file in the virtual file system and opens it.

- buffer: ArrayBuffer containing MPQ data
- mode: optional; same as the mode flags in `MPQ.open` with one extra flag
  - mpqName: string; path of the file created in the virtual file system
- returns: object; MPQ instance

This function can also be called with `MPQ.fromArrayBuffer( buffer, mpqName, [ mode ])`.

#### **async** MPQ.create( path, [ mode ])

Creates an empty MPQ archive in the virtual file system.

- path: string; path of the file created in the virtual file system
- mode: object; optional; contains the following values
  - version: number; MPQ version, can be one of `[ 1, 2, 3, 4 ]`
  - streamFlags: number
  - fileFlagsListfile: number; file flags for (listfile). Set to 0 to not have a (listfile).
  - fileFlagsAttributes: number; file flags for (attributes). Set to 0 to not have an (attributes).
  - fileFlagsSignature: number; file flags for (signature). Value of 0x80000000 will sign the archive with weak signature.
  - attributeFlags: can be one of these types
    - number: raw uint32 flags for StormLib
    - object: an object containing the following flags
      - crc32: boolean; (attributes) contains CRC32 for each file
      - time: boolean; (attributes) contains file time for each file
      - md5: boolean; (attributes) contains MD5 for each file
      - patchBit: boolean; (attributes) contains a patch bit for each file
  - sectorSize: number; sector size for the compressed files, must be a power of two.
  - rawChunkSize: number; size of a raw chunk, only used by MPQ version 4.
  - maxFiles: number; max number of files (hash table size). must be between 4 and 524288.
- returns: object; MPQ instance

This function can also be called with `MPQ.create( path, flags, maxFiles )`, where `flags` is the raw uint32 flags for StormLib.

## MPQ methods

Methods of an MPQ instance, such as `const mpq = MPQ.open("/path/to/your.mpq");`.

#### mpq.hasFile( fileName )

Checks if the MPQ archive has a file of given name.

- fileName: string; path of the file in MPQ
- returns: boolean; whether the file exists

#### mpq.openFile( fileName )

Opens a file in the MPQ archive. If the file does not exist, this function will throw an error.

- fileName: string; path of the file in MPQ
- returns: object; File instance

#### mpq.readFile( fileName, [ encoding ] )

Reads a file in the MPQ archive.

- fileName: string; path of the file in MPQ
- encoding: string; optional
  - if specified, it reads the file as string of the specified encoding.
  - if omitted, it reads the file as an ArrayBuffer.
- returns: ArrayBuffer or string depending on encoding parameter

#### mpq.patch( mpqPath )

Patches the MPQ with another MPQ file.

- returns: the MPQ instance itself

- mpqPath: string; path of the pach file in virtual file system

#### mpq.isPatched()

Checks if the MPQ is patched.

- returns: boolean; whether the MPQ is patched

#### mpq.search( mask, [ listfile ] )

Searches for a list of files in the MPQ from a given mask.

- mask: search mask. "\*" will return all files.
- listfile: additional listfile provided to the MPQ. If omitted, StormLib will attempt to use the internal (listfile).
- returns: an array of objects; each contains following properties
  - fileName: string; name of the file
  - plainName: string; plain name of the file
  - hashIndex: number
  - blockIndex: number
  - fileSize: number; file size
  - compSize: number; compressed file size
  - fileTimeLo: number; low 32 bits of file time
  - fileTimeHi: number; high 32 bits of file time
  - locale: string; locale ID

#### mpq.addFile( fileNameInFS, [ fileNameInMpq, flags ] )

Add a file from the virtual file system to the MPQ archive.

- fileNameInFS: string; path to file in virtual file system.
- fileNameInMpq: string; optional; path to file to be added in MPQ archive. If omitted, it will use the same path as fileNameInFS.
- flags: object; optional; if omitted, it will be set to `{"replace": true, "compress": true, "encrypt": true}`.
  - implode: boolean; an obsolete compression method
  - compress: boolean; file is compressed
  - compression: can be one of these types
    - number: raw uint32 flags for StormLib
    - string: compression method; one of `["huffman", "zlib", "pkware", "bzip2", "lzma", "sparse", "adpcmMono", "adpcmStereo"]`.
    - array of strings: combinations of the compression methods above
    - this will set the compress flag to true
    - for more information, see http://zezula.net/en/mpq/stormlib/sfileaddfileex.html
  - compressionHeader: same type as compression; if specified, will use a different compression method on header of the file
  - encrypt: boolean; file is encrypted
  - fixKey: boolean; encryption key is fixed according to the position of the file in MPQ archive
  - singleUnit: boolean; file is stored as a single unit; cannot be encrypted
  - deleted: boolean; file has the deletion flag; can still be read
  - sectorCRC: boolean; file has a sector CRC
  - replace: boolean; replaces existing file if there exists, instead of throwing an error

This function can also be called with `MPQ.addFile( fileNameInFS, fileNameInMpq, flags, compress, compressNext)`, where `flags`, `compress` and `compressNext` are raw uint32 flags for StormLib.

#### mpq.addFileFromArrayBuffer( fileNameInMpq, buffer, [ flags ] )

Saves an ArrayBuffer to the virtual file system, and adds it to the MPQ.

- fileNameInMpq: string; path to file to be added in MPQ archive.
- buffer: ArrayBuffer of the file data.
- flags: same as flags in `mpq.addFile`; can contain an extra value
  - fsFileName: string; path to the file saved in virtual file system.

#### mpq.extractFile( fileNameInMpq, fileNameInFS )

Extracts a file from the MPQ archive to the virtual file system.

- fileNameInMpq: string; path to file in MPQ archive.
- fileNameInFS: string; path to file in virtual file system.

#### mpq.renameFile( fileName, newName )

Renames a file in the MPQ archive.

- fileName: string; old name of file in MPQ archive
- newName: string; new name
- returns: the MPQ instance itself

#### mpq.removeFile( fileName )

Removes a file in the MPQ archive.

- fileName: string; path to file in MPQ archive to be removed
- returns: the MPQ instance itself

#### mpq.compact( [ listfile ] )

Compacts MPQ file, removing gaps created by write operations.

- listfile: additional listfile provided to the MPQ. If omitted, StormLib will attempt to use the internal (listfile).
- returns: the MPQ instance itself

#### mpq.toArrayBuffer()

Reads the MPQ data into an ArrayBuffer.

- returns: ArrayBuffer containing the MPQ file data

#### mpq.close()

Closes the MPQ file.

#### mpq.getFileInfo( infoClass )

Gets information about the MPQ archive.

- infoClass: can be one of the following values
  - mpqName: returns string; do not read it here, use mpq.filePath instead
  - streamBitmap: returns ArrayBuffer
  - userDataOffset: returns int64 as an array of two numbers [ low32bit, high32bit ]
  - userDataHeader: returns ArrayBuffer
  - userData: returns ArrayBuffer
  - headerOffset: returns [ low32bit, high32bit ]; offset of the MPQ header in MPQ archive
  - headerSize: returns number; size of the MPQ header
  - header: returns ArrayBuffer
  - hetTableOffset: returns [ low32bit, high32bit ]
  - hetTableSize: returns [ low32bit, high32bit ]
  - hetHeader: returns ArrayBuffer
  - hetTable: returns pointer; HET table is a "better version" of hash table used by MPQ v3 and above. check [MPQ Format](http://zezula.net/en/mpq/mpqformat.html)
  - betTableOffset: returns [ low32bit, high32bit ]
  - betTableSize: returns [ low32bit, high32bit ]
  - betHeader: returns ArrayBuffer; BET table is a "better version" of block table used by MPQ v3 and above. check [MPQ Format](http://zezula.net/en/mpq/mpqformat.html)
  - betTable: returns pointer
  - hashTableOffset: returns [ low32bit, high32bit ]
  - hashTableSize64: returns [ low32bit, high32bit ]; byte size
  - hashTableSize: returns number; number of entries
  - hashTable: returns ArrayBuffer; MPQ calculates a hash from the file name and looks for file in this hash table.
  - blockTableOffset: returns [ low32bit, high32bit ]
  - blockTableSize64: returns [ low32bit, high32bit ]; byte size
  - blockTableSize: returns number; number of entries
  - blockTable: returns ArrayBuffer; Block table is used to find the exact position of file after locating it in the hash table.
  - hiBlockTableOffset: returns [ low32bit, high32bit ]
  - hiBlockTableSize64: returns [ low32bit, high32bit ]
  - hiBlockTable: returns ArrayBuffer; not implemented by StormLib
  - signatures: returns number; combination of two bits
    - 0x1: has weak signature
    - 0x2: has strong signature
  - strongSignatureOffset: returns [ low32bit, high32bit ]
  - strongSignatureSize: returns number
  - strongSignature: returns ArrayBuffer
  - archiveSize64: returns [ low32bit, high32bit ]
  - archiveSize: returns number
  - maxFileCount: returns number; current limit of number of files
  - fileTableSize: returns number; number of entries
  - sectorSize: returns number; number of bytes
  - numberOfFiles: returns number; number of files
  - rawChunkSize: returns number; size of raw MPQ chunk. if the MPQ does not support raw chunks, it will throw an error.
  - streamFlags: returns number
  - flags: returns number; nonzero if the MPQ is read only

#### mpq.getFileInfo( fileName, infoClass )

Gets information about a file in the MPQ archive.

- fileName: string; path of the file in MPQ
- infoClass: can be one of the following values
  - patchChain: returns ArrayBuffer of a multi-string value containing each patch archive
  - fileEntry: returns ArrayBuffer
  - hashEntry: returns ArrayBuffer
  - hashIndex: returns number; index of hash hash table where the entry is
  - nameHash1: returns number; first hash of the file name
  - nameHash2: returns number; second hash of the file name
  - nameHash3: returns int64 as [ low32bit, high32bit ]; 64-bit Jenkins hash used to search in the HET table
  - locale: returns string; locale ID of the file
  - fileIndex: returns number; index in the file table of the file.
  - byteOffset: returns [ low32bit, high32bit ]; offset relative to MPQ header
  - fileTime: returns [ low32bit, high32bit ]; file time
  - fileSize: returns number; uncompressed size of file
  - compressedSize: returns number; compressed size of file
  - flags: returns object; can have the following boolean flags
    - implode: implode compression method (obsolete)
    - compress: file is compressed
    - encrypt: file is encrypted
    - fixKey: encryption key is fixed according to position of the file in MPQ archive
    - singleUnit: single unit
    - deleted: delete marker
    - sectorCRC: sector CRC present
    - 0x10000000: is standard.snp/(signature)
    - exists: file exists
  - encryptionKey: returns number; encryption key of the file
  - encryptionKeyRaw: returns number; raw, not fixed encryption key of the file
  - crc32: returns number; file crc32 checksum

#### mpq.locale( [ lcid ] )

Gets/Sets the current locale. Note that it sets locale for all the MPQs (entire StormLib).

- lcid: the locale ID to set. If not present, the function will return with the current locale ID.
  - number: LCID used in C, e.g. 0x409 for English (US)
  - string: LCID used in web, e.g. en_US for English (US). returns this type of LCIDs.
- returns: the MPQ instance itself if lcid is present; string otherwise

Also can be called with `MPQ.locale( [lcid] )`.

#### mpq.sign()

Signs the MPQ with a weak signature.

- returns: the MPQ instance itself

#### mpq.verify()

Verifies the MPQ signature. If verification fails, this function will throw an error.
Always passes the verification if there is no signature.

- returns: the MPQ instance itself

#### mpq.verifyStatus()

Verifies the MPQ signature, and returns the verification status.

- returns: number; values containing
  - 0: no signature
  - 1: error occured during verifying the signature, such as out of memory
  - 2: weak signature verified successfully
  - 3: weak signature verify failed
  - 4: strong signature verified successfully
  - 5: strong signature verify failed

#### mpq.verifyFile( fileName, [ flags ] )

Verifies a file the MPQ signature. If verification fails, this function will throw an error.

- fileName: string; file name in MPQ archive
- flags: optional; can be one of the following types. If omitted, this function will check all available flags.
  - number: raw flags for StormLib
  - object: contains the following flags
    - sectorCRC: boolean; checks sector CRC
    - fileCRC: boolean; checks file CRC
    - fileMD5: boolean; checks file MD5
    - rawMD5: boolean; checks raw data MD5
- returns: the MPQ instance itself

#### mpq.verifyFileStatus( fileName, [ flags ] )

Verifies a file in the MPQ, and returns the verification status.

- fileName: string; file name in MPQ archive
- flags: optional; same as `mpq.verifyFile`
- returns: number; contains the following bits
  - 0x001: cannot open file
  - 0x002: read file failure
  - 0x004: file has a sector CRC
  - 0x008: sector CRC failed for verification
  - 0x010: file has a file CRC
  - 0x020: file CRC failed for verification
  - 0x040: file has a file MD5
  - 0x080: file MD5 failed for verification
  - 0x100: file has raw data MD5
  - 0x200: raw data MD5 failed for verification

#### mpq.flush()

Saves any unsaved changes to the MPQ file in virtual file system.

- returns: the MPQ instance itself

#### mpq.setMaxFiles(maxCount)

Set the max number of files in the MPQ. If this function is called to set to a smaller size when the MPQ already has some files, it may throw an error.

- maxCount: number; max file count in the MPQ. must be between 4 and 524288.
- returns: the MPQ instance itself

## File methods

Methods of an File instance created from `mpq.openFile`.

#### file.name

Read-only property to get the name of the file.

#### file.pos

Get or set the read position of the file.

#### file.size

Read-only property to get the size of the file.

#### file.read()

Reads the contents of the file into an ArrayBuffer. Please copy the data using `buffer.slice()` or similar methods before closing the file.

- returns: ArrayBuffer of file data

#### file.createStream()

Creates a FileStream from the file instance.

- returns: FileStream instance

#### file.setLocale( lcid )

Sets the locale ID of file in the MPQ archive.

- lcid: the locale ID to set
  - number: LCID used in C, e.g. 0x409 for English (US)
  - string: LCID used in web, e.g. en_US for English (US)

#### file.getInfo( infoClass )

Gets information about the file. See `mpq.getFileInfo` for more information.

- infoClass: string; refer to `mpq.getFileInfo`
- returns: any type

#### file.close()

Closes the file.