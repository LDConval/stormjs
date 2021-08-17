import { notDeepEqual } from 'assert';
import path from 'path';
import { File, FS, MPQ } from '../lib';
import StormLib from '../lib/stormlib';

const rootDir = path.resolve(__filename, '../../../');

describe('MPQ', () => {
  beforeAll(() => {
    FS.mkdir('/fixture');
    FS.mount(FS.filesystems.NODEFS, { root: `${rootDir}/fixture` }, '/fixture');
    FS.mkdir('/tests');
  });

  describe('Opening / Closing', () => {
    test('opens and closes MPQ', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      mpq.close();

      expect(mpq).toBeInstanceOf(MPQ);
    });

    test('throws if opening nonexistent MPQ', async () => {
      expect.assertions(1);

      try {
        const mpq = await MPQ.open('/fixture/nonexistent.mpq');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('throws if closing MPQ with invalid handle', async () => {
      expect.assertions(1);

      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const originalHandle = mpq.handle;
      const invalidHandle = new StormLib.VoidPtr();

      mpq.handle = invalidHandle;

      expect(() => mpq.close()).toThrow(Error);

      invalidHandle.delete();
      mpq.handle = originalHandle;
      mpq.close();
    });

    test('closes MPQ with noop if already closed', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      mpq.close();

      const result = mpq.close();

      expect(result).toBeUndefined();
    });
  });

  describe('Patching', () => {
    test('patches MPQ', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq', 'r');
      mpq.patch('/fixture/size.mpq');

      const result1 = mpq.hasFile('fixture.txt');
      const result2 = mpq.hasFile('fixture-64kb.txt');

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      mpq.close();
    });

    test('throws if patching MPQ with nonexistent MPQ', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq', 'r');

      expect(() => mpq.patch('/fixture/nonexistent.mpq')).toThrow(Error);

      mpq.close();
    });
  });

  describe('Files', () => {
    test('opens and returns valid file', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const file = mpq.openFile('fixture.txt');

      expect(file).toBeInstanceOf(File);

      file.close();
      mpq.close();
    });

    test('throws if opening file from closed MPQ', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      mpq.close();

      expect(() => mpq.openFile('fixture.txt')).toThrow(Error);
    });

    test('throws if opening nonexistent file', async () => {
      expect.assertions(1);

      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      expect(() => mpq.openFile('nonexistent.txt')).toThrow(Error);

      mpq.close();
    });

    test('checks for presence of file', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const result = mpq.hasFile('fixture.txt');

      expect(result).toBe(true);

      mpq.close();
    });

    test('checks for presence of nonexistent file', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const result = mpq.hasFile('foo-bar.baz');

      expect(result).toBe(false);

      mpq.close();
    });

    test('throws if checking for presence of file in closed MPQ', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      mpq.close();

      expect(() => mpq.hasFile('foo-bar.baz')).toThrow(Error);
    });

    test('throws if checking for presence of file in MPQ with invalid handle', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const originalHandle = mpq.handle;
      const invalidHandle = new StormLib.VoidPtr();

      mpq.handle = invalidHandle;

      expect(() => mpq.hasFile('foo-bar.baz')).toThrow(Error);

      invalidHandle.delete();
      mpq.handle = originalHandle;
      mpq.close();
    });
  });

  describe('Searching', () => {
    test('finds all files', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const results = mpq.search('*');

      expect(results).toBeInstanceOf(Array);

      expect(results.map((r) => r.fileName)).toEqual([
        'fixture-deDE.txt',
        '(listfile)',
        'nested\\fixture-nested.txt',
        'fixture.png',
        '(attributes)',
        'fixture.txt',
        'fixture.xml'
      ]);

      mpq.close();
    });

    test('returns result with appropriate shape', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const result = mpq.search('fixture.txt')[0];

      expect(result).toEqual({
        fileName: 'fixture.txt',
        plainName: 'fixture.txt',
        hashIndex: 3886,
        blockIndex: 0,
        fileSize: 13,
        compSize: 21,
        fileTimeLo: 414638976,
        fileTimeHi: 30643794,
        locale: 0
      });

      mpq.close();
    });

    test('returns empty array if no results found', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const results = mpq.search('foo-bar.baz');

      expect(results).toEqual([]);

      mpq.close();
    });

    test('throws if calling find on closed mpq', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      mpq.close();

      expect(() => mpq.search('*')).toThrow(Error);
    });

    test('throws if calling find on mpq with invalid handle', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');

      const originalHandle = mpq.handle;
      const invalidHandle = new StormLib.VoidPtr();

      mpq.handle = invalidHandle;

      expect(() => mpq.search('*')).toThrow(Error);

      invalidHandle.delete();
      mpq.handle = originalHandle;
      mpq.close();
    });
  });

  describe('Write / Extra', () => {
    test('create new mpqs', async () => {

      const mpq1 = await MPQ.create('/tests/createDefault.mpq');
      mpq1.close();
      const mpq2 = await MPQ.create('/tests/createV3.mpq', 0x2700000, 0x1000);
      mpq2.close();
      const mpq3 = await MPQ.create('tests/createV2Small.mpq', 0x1100000, 0x10);
      mpq3.close();
      const mpq4 = await MPQ.create('/tests/createObjParams.mpq', {
        version : 2,
        sectorSize : 2048,
        maxFiles : 300
      });
      mpq4.close();
      const mpq5 = await MPQ.create('/tests/createObjParams2.mpq', {
        version : 2,
        attributeFlags : 1,
        fileFlagsAttributes : 0x80010200,
      });
      mpq5.close();
      const mpq6 = await MPQ.create('/tests/createObjParams3.mpq', {
        version : 2,
        attributeFlags : {
          "crc32" : true,
          "time" : true,
          "md5" : true,
          "patchBit" : true,
        },
        fileFlagsAttributes : {
          "compress" : true,
          "compression" : ["bzip2", "zlib"],
          "encrypt" : true,
          "fixKey" : true,
        },
        fileFlagsListfile : {
          "compress" : false,
        },
      });
      mpq6.close();
      const mpq7 = await MPQ.create('/tests/createObjParams4.mpq', {
        version : 4,
        attributeFlags : {
          "crc32" : false,
          "time" : 0,
          "md5" : null,
        },
        fileFlagsAttributes : {
          "singleUnit" : true,
        },
        fileFlagsListfile : {
          "implode" : true,
        },
      });
      mpq7.close();

      expect(mpq1).toBeInstanceOf(MPQ);
      expect(mpq2).toBeInstanceOf(MPQ);
      expect(mpq3).toBeInstanceOf(MPQ);
      expect(mpq4).toBeInstanceOf(MPQ);
      expect(mpq5).toBeInstanceOf(MPQ);
      expect(mpq6).toBeInstanceOf(MPQ);
      expect(mpq7).toBeInstanceOf(MPQ);
    });

    test('create new mpqs with bad options', async () => {
      await expect(MPQ.create('/tests/createObjParams.mpq', 0x110000, 2048)).rejects.toThrow(Error);
      await expect(MPQ.create('/tests/createA.mpq', 0, 0)).rejects.toThrow(Error);
      await expect(MPQ.create('/tests/createB.mpq', 0x110000, 0x00400000)).rejects.toThrow(Error);
      await expect(MPQ.create('/tests/createC.mpq', {
        version : 18
      })).rejects.toThrow(Error);
      await expect(MPQ.create('/tests/createD.mpq', {
        sectorSize : 33333
      })).rejects.toThrow(Error);
      await expect(MPQ.create('/tests/unknown/createE.mpq')).rejects.toThrow(Error);
    });

    test('extract files', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');
      mpq.extractFile("fixture.txt", "/tests/fixture-001.txt");
      mpq.extractFile("fixture.xml", "/tests/fixture-002.xml");

      expect(FS.readFile("/tests/fixture-001.txt")).toHaveLength(13);
      expect(FS.readFile("/tests/fixture-002.xml")).toBeInstanceOf(Uint8Array);

      mpq.close();
    });

    test('extract bad files', async () => {
      const mpq = await MPQ.open('/fixture/vanilla-standard.mpq');
      expect(() => mpq.extractFile("fixture-nonexistent.txt", "/tests/unknown.txt")).toThrow(Error);
      expect(() => mpq.extractFile("fixture.txt", "/tests/path/to/hell/unknown.txt")).toThrow(Error);
      mpq.close();
    });

    test('check mpq lcid', async () => {
      expect(MPQ.locale()).toEqual("Neutral");
      expect(MPQ.locale(0x409)).toEqual("en_US");
      expect(MPQ.locale()).toEqual("en_US");
      expect(MPQ.locale("Ko-Kr")).toEqual("ko_KR");
      expect(MPQ.locale()).toEqual("ko_KR");
      expect(MPQ.locale("Neutral")).toEqual("Neutral");
    });

    test('add files to mpq', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      mpq.addFile("/tests/fixture-001.txt", "fixt001.txt")
        .addFile("/tests/fixture-001.txt", "fixt002.txt", 0x80000200, 0x2, 0x8)
        .addFile("/tests/fixture-001.txt", {
          "compress" : true,
          "encrypt" : true,
          "replace" : false,
        })
        .addFile("/tests/fixture-001.txt", "fixt003.txt", {
          "compress" : true,
          "compression" : "lzma",
          "sectorCRC" : true,
          "replace" : true,
        })
        .locale("en_US")
        .addFile("/tests/fixture-001.txt", "fixt004.txt", {
          "compress" : true,
          "compression" : ["bzip2", "zlib"],
        })
        .addFile("/tests/fixture-001.txt", "fixt006.txt", {
          "compress" : true,
          "compression" : 0x18,
        })
        .addFile("/tests/fixture-001.txt", "fixt006.txt", {
          "compress" : false,
          "singleUnit" : true,
          "replace" : true
        })
        .addFile("/tests/fixture-001.txt", "fixt007.txt", {
          "compress" : false,
          "encrypt" : true,
          "fixKey" : true
        })
        .addFile("/tests/fixture-001.txt", "fixt008.txt", {
          "implode" : true,
        })
        .addFile("/tests/fixture-001.txt", "fixt009.txt", {
          "deleted" : true,
          "compress" : true,
          "encrypt" : true,
        })
        .locale("Neutral")
        .addFile("/tests/fixture-002.xml", "fixt005.xml", 0x200, 0x12, 0x12);

      expect(mpq.readFile("fixt001.txt")).toHaveLength(13);
      expect(mpq.readFile("fixt002.txt")).toHaveLength(13);
      expect(mpq.readFile("fixt003.txt")).toHaveLength(13);
      expect(mpq.locale("en_US").readFile("fixt004.txt")).toHaveLength(13);
      expect(mpq.locale("Neutral").readFile("/tests/fixture-001.txt")).toHaveLength(13);
      expect(mpq.readFile("fixt005.xml")).toBeInstanceOf(Uint8Array);
      mpq.close();
    });

    test('throw error when adding bad files', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      expect(() => mpq.addFile("/tests/nonexistent.txt")).toThrow(Error);
      expect(() => mpq.addFile("/tests/nonexistent.txt", "aaa.aaa", 0x80000200, 0x2, 0x8)).toThrow(Error);
      expect(() => mpq.addFile("/tests/fixture-001.txt", "fixt003.txt", 0x200, 0x2, 0x8)).toThrow(Error);
      expect(() => mpq.addFile("/tests/fixture-001.txt", "fixt080.txt", {
        "compression" : "hydraulic"
      })).toThrow(Error);
      expect(() => mpq.addFile("/tests/fixture-001.txt", "fixt080.txt", {
        "compression" : ["zlib", "smartphone", "microwave"]
      })).toThrow(Error);
      expect(() => mpq.addFile("/tests/fixture-001.txt", "fixt080.txt", {
        "implode" : true,
        "compress" : true,
      })).toThrow(Error);
      expect(() => mpq.addFile("/tests/fixture-001.txt", "fixt080.txt", {
        "implode" : true,
        "compression" : "zlib",
      })).toThrow(Error);
      mpq.close();
    });

    test('additional open options', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq', {
        "readOnly": true,
        "partial": false,
        "mpqe": false,
        "block4": false,
        "useBitmap": true,
        "noListfile": true,
        "noAttributes": true,
        "noHeaderSearch": true,
        "forceMpqV1": true,
        "checkSectorCRC": true,
      });
      expect(mpq).toBeInstanceOf(MPQ);
      mpq.close();
      await expect(MPQ.open('/tests/createDefault.mpq', {
        "partial": true
      })).rejects.toThrow(Error);
      await expect(MPQ.open('/tests/createDefault.mpq', {
        "mpqe": true
      })).rejects.toThrow(Error);
      await expect(MPQ.open('/tests/createDefault.mpq', {
        "block4": true
      })).rejects.toThrow(Error);

      const mpq1 = await MPQ.open('/tests/createDefault.mpq');

      let mpq2 = new MPQ(mpq.handle);
      expect(mpq2).toBeInstanceOf(MPQ);
      expect(mpq2.filePath).toEqual("");

      mpq1.close();
    });

    test('unicode test', async () => {
      const mpq = await MPQ.create('/tests/\u5444\u6868\ub3b5\u2700.mpq');
      mpq.addFile("/tests/fixture-001.txt", "\u8400\uaaaa\u9999\ubfbf.txt")
        .extractFile("\u8400\uaaaa\u9999\ubfbf.txt", "/tests/u\u3553\u4755\u8400.txt")
        .addFile("/tests/u\u3553\u4755\u8400.txt", "duh.txt");

      expect(mpq.readFile("duh.txt")).toHaveLength(13);
      expect(mpq.readFile("\u8400\uaaaa\u9999\ubfbf.txt")).toHaveLength(13);
      mpq.close();
      const mpq2 = await MPQ.create('/tests/:?"<>".mpq');
      mpq2.close();
    });

    test('mpq file info', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      expect(mpq.getInfo("fileName")).toEqual('/tests/createDefault.mpq');
      expect(mpq.getInfo("hashTableSize")).toEqual(0x400);
      expect(mpq.getInfo("hashTableSize64")).toEqual([16384, 0]);
      expect(mpq.getInfo("hashTable")).toBeInstanceOf(Uint8Array);
      expect(mpq.locale("en_US").getFileInfo("fixt001.txt", "locale")).toEqual("Neutral");
      expect(mpq.getFileInfo("fixt004.txt", "locale")).toEqual("en_US");
      expect(mpq.locale()).toEqual("en_US");
      expect(mpq.locale("Neutral").getFileInfo("fixt001.txt", "fileSize")).toEqual(13);

      expect(() => mpq.getInfo(52)).toThrow(Error);

      mpq.close();
    });

    test('sign and verify', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      expect(mpq.verify()).toBeTruthy();
      expect(mpq.verifyStatus()).toEqual(0);
      mpq.sign();
      expect(mpq.verify()).toBeTruthy();
      expect(mpq.verifyStatus()).toEqual(2);

      expect(mpq.verifyFile("fixt001.txt", 1)).toBeTruthy();
      expect(mpq.verifyFileStatus("fixt001.txt", { "sectorCRC" : true })).toEqual(0);

      expect(mpq.verifyFile("fixt003.txt")).toBeTruthy();
      expect(mpq.verifyFileStatus("fixt003.txt", 0xF)).toEqual(4);
      expect(mpq.verifyFileStatus("fixt003.txt", { "sectorCRC" : false })).toEqual(0);
      expect(mpq.verifyFileStatus("fixt003.txt", {
        "sectorCRC" : true,
        "fileCRC" : true,
        "fileMD5" : true,
        "rawMD5" : true,
      })).toEqual(4);

      expect(() => mpq.verifyFile("nonexistent.txt", 0x1)).toThrow(Error);

      mpq.close();
    });

    test('rename and remove files', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      mpq.renameFile("fixt003.txt", "renamed003.txt");
      expect(() => mpq.readFile("fixt003.txt")).toThrow(Error);
      expect(mpq.readFile("renamed003.txt")).toHaveLength(13);

      mpq.removeFile("renamed003.txt");
      expect(() => mpq.readFile("renamed003.txt")).toThrow(Error);

      expect(() => mpq.removeFile("renamed003.txt")).toThrow(Error);
      expect(() => mpq.renameFile("renamed003.txt", "rerenamed003.txt")).toThrow(Error);
      expect(() => mpq.locale(0).removeFile("fixt004.txt")).toThrow(Error);

      mpq.close();
    });

    test('arraybuffer operations', async () => {
      let ab = FS.readFile("/fixture/vanilla-standard.mpq");
      const mpq1 = await MPQ.fromArrayBuffer(ab, { readOnly: true, name: "abmpq001.mpq", maxFiles: 2150 });
      mpq1.close();
      const mpq2 = await MPQ.fromArrayBuffer(ab.buffer);
      mpq2.close();

      let abMulti4 = FS.readFile("/fixture/size.mpq");
      const mpq3 = await MPQ.fromArrayBuffer(new Int32Array(abMulti4.buffer), { name: "abmpq002.mpq" });
      mpq3.close();
      const mpq4 = await MPQ.fromArrayBuffer(new Uint32Array(abMulti4.buffer), { mpqName: "abmpq003.mpq" });
      mpq4.close();
      const mpq5 = await MPQ.fromArrayBuffer(new Uint16Array(abMulti4.buffer), { readOnly: true });
      mpq5.close();

      expect(mpq1).toBeInstanceOf(MPQ);
      expect(mpq2).toBeInstanceOf(MPQ);
      expect(mpq3).toBeInstanceOf(MPQ);
      expect(mpq4).toBeInstanceOf(MPQ);
      expect(mpq5).toBeInstanceOf(MPQ);

      const mpq = await MPQ.fromArrayBuffer(ab, "dw010bp.mpq", 0x100000);

      expect(mpq.readFile("fixture.txt")).toHaveLength(13);

      let abf = new Uint8Array([99, 33, 88, 44, 77, 66, 55]);
      let abf32 = new Int32Array([1986094418, 1495298661, 1768318575, 1634607214, 1818840608, 1953718630]);
      mpq.addFileFromArrayBuffer("addfileab.txt", abf);
      mpq.addFileFromArrayBuffer("addfileabi32_1.txt", abf32, { fsFileName: "test0.txt" });
      mpq.addFileFromArrayBuffer("addfileabi32_2.txt", abf32.buffer);
      mpq.addFileFromArrayBuffer("addfileabi32_3.txt", new Uint8Array(abf32.buffer));

      expect(mpq.readFile("addfileab.txt")).toHaveLength(7);
      expect(mpq.readFile("addfileab.txt", "utf8")).toEqual("c!X,MB7");
      expect(mpq.readFile("addfileabi32_1.txt", "utf8")).toEqual("Reaver Yoffin na Nilfast");
      expect(mpq.readFile("addfileabi32_2.txt", "utf8")).toEqual("Reaver Yoffin na Nilfast");
      expect(mpq.readFile("addfileabi32_3.txt", "utf8")).toEqual("Reaver Yoffin na Nilfast");

      expect(mpq.compact().toArrayBuffer()).toBeInstanceOf(Uint8Array);

      mpq.close();

      // invalid parameter combination
      await expect(MPQ.fromArrayBuffer(ab, {
        readOnly: true,
        name: "abnormalmpq.mpq"
      }, 4000)).rejects.toThrow(Error);

      // do not leave temp file in FS
      expect(() => FS.readFile("test0.txt")).toThrow(Error);
    });

    test('set max file count', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      expect(mpq.setMaxFiles(4096)).toBeTruthy();
      expect(() => mpq.setMaxFiles(400000000)).toThrow(Error);

      for (let i = 0; i < 1000; i++) {
        mpq.addFile("/tests/fixture-001.txt", `fixt_${i}.txt`);
      }
      expect(() => mpq.setMaxFiles(256)).toThrow(Error);

      // SFileSetMaxFileCount will throw if setting a lower limit when there are already some files
      // (e.g. because the hash tables were already filled)
      expect(() => mpq.setMaxFiles(2048)).toThrow(Error);

      expect(mpq.isPatched()).toEqual(false);

      mpq.close();
    });

    test('add listfile', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      mpq.extractFile("(listfile)", "/tests/listfile.txt");
      expect(mpq.addListfile("(listfile)")).toBeTruthy();
      expect(() => mpq.addListfile("/tests/fixture-001.txt")).toThrow(Error);

      mpq.close();
    });

    test('throw error for invalid handles', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      const originalHandle = mpq.handle;
      const invalidHandle = new StormLib.VoidPtr();

      mpq.handle = invalidHandle;

      expect(() => mpq.sign()).toThrow(Error);
      expect(() => mpq.flush()).toThrow(Error);
      expect(() => mpq.compact()).toThrow(Error);
      expect(() => mpq.verify()).toThrow(Error);
      expect(() => mpq.verifyFile("a.txt")).toThrow(Error);

      invalidHandle.delete();
      mpq.handle = originalHandle;
      mpq.close();
    });

    test('special cases verify and verifyFile', async () => {
      const mpq = await MPQ.open('/tests/createDefault.mpq');

      let _SFileSFileVerifyArchive = StormLib.SFileVerifyArchive;
      let _SFileVerifyFile = StormLib.SFileVerifyFile;

      // Test for different possible outputs for verify()
      // and verifyFile() here. These are unobtainable using
      // normal MPQ operations i.e. without knowing the format
      // enough to corrupt just the right data.
      StormLib.SFileVerifyArchive = () => 3;
      expect(() => mpq.verify()).toThrow(Error);
      StormLib.SFileVerifyArchive = () => 4;
      expect(mpq.verify()).toBeTruthy();
      StormLib.SFileVerifyArchive = () => 5;
      expect(() => mpq.verify()).toThrow(Error);
      StormLib.SFileVerifyFile = () => 0x1;
      expect(() => mpq.verifyFile("a.txt")).toThrow(Error);
      StormLib.SFileVerifyFile = () => 0x210;
      expect(() => mpq.verifyFile("a.txt")).toThrow(Error);
      StormLib.SFileVerifyFile = () => 0x80;
      expect(() => mpq.verifyFile("a.txt")).toThrow(Error);
      StormLib.SFileVerifyFile = () => 0x40;
      expect(mpq.verifyFile("a.txt")).toBeTruthy();
      StormLib.SFileVerifyFile = () => 0x14;
      expect(mpq.verifyFile("a.txt")).toBeTruthy();

      StormLib.SFileVerifyArchive = _SFileSFileVerifyArchive;
      StormLib.SFileVerifyFile = _SFileVerifyFile;

      mpq.close();
    });
  });
});
