//process.env.NODE_ENV = 'production';

const { FS, MPQ, StormLib } = require('../dist/index.js');

window.FS = FS;
window.MPQ = MPQ;
window.StormLib = StormLib;