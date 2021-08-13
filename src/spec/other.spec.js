describe('Unnecessary Tests', () => {
  var _env;

  beforeEach(() => {
    jest.resetModules();
    _env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = _env;
  });

  describe('Load StormLib in production mode', () => {
    test('test stormlib in prod mode', async () => {
      let StormLib = require('../lib/stormlib');
      await StormLib.ready;
      expect(StormLib.VoidPtr).toBeTruthy();
      expect(StormLib.FS).toBeTruthy();
      expect(StormLib.FS.readFile).toBeTruthy();
      expect(StormLib.SFileReadFile).toBeTruthy();
      expect(StormLib.SFileOpenArchive).toBeTruthy();
      expect(StormLib.SFileWriteFile).toBeTruthy();
      expect(StormLib.SFileCloseFile).toBeTruthy();
    });
  });
  describe('LCID', () => {
    test('improve test coverage', async () => {
      let {LCID, LCIDToC, LCIDToJS, invLCID} = require('../lib/lcid/index.mjs');

      expect(LCID[0x409]).toEqual("en_US");
      expect(invLCID["en_US".toLowerCase()]).toEqual(0x409);
      expect(LCIDToC("en_US")).toEqual(0x409);
      expect(LCIDToC("EN-us")).toEqual(0x409);
      expect(LCIDToC(0x409)).toEqual(0x409);
      expect(LCIDToC("fr_FR")).toEqual(1036);
      expect(LCIDToJS(1036)).toEqual("fr_FR");
      expect(LCIDToJS("fr_FR")).toEqual("fr_FR");
      expect(LCIDToC()).toEqual(0);
      expect(LCIDToJS()).toEqual("Neutral");
    });
  });
});