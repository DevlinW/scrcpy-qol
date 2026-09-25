const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const security = require('../src/utils/security');
const scrcpyService = require('../src/services/scrcpyService');
const configService = require('../src/services/configService');
const adbService = require('../src/services/adbService');

test('Security Utils - Package Name Validation', () => {
  assert.equal(security.isValidPackageName('com.spotify.music'), true);
  assert.equal(security.isValidPackageName('com.riotgames.league.wildrift'), true);
  assert.equal(security.isValidPackageName('org.videolan.vlc'), true);

  // Rejects injections and malformed package names
  assert.equal(security.isValidPackageName('com.example.app; rm -rf /'), false);
  assert.equal(security.isValidPackageName('com.example.app && echo hacked'), false);
  assert.equal(security.isValidPackageName('../../etc/passwd'), false);
  assert.equal(security.isValidPackageName('com.foo`id`'), false);
  assert.equal(security.isValidPackageName('singleword'), false);
  assert.equal(security.isValidPackageName(''), false);
  assert.equal(security.isValidPackageName(null), false);
});

test('Security Utils - Serial Validation', () => {
  assert.equal(security.isValidSerial('89c3af9e'), true);
  assert.equal(security.isValidSerial('192.168.1.105:5555'), true);
  assert.equal(security.isValidSerial('emulator-5554'), true);

  // Rejects injection characters
  assert.equal(security.isValidSerial('89c3af9e; taskkill'), false);
  assert.equal(security.isValidSerial('192.168.1.105 & calc.exe'), false);
  assert.equal(security.isValidSerial(''), false);
});

test('Security Utils - Bitrate Sanitization', () => {
  assert.equal(security.sanitizeBitrate('4M'), '4M');
  assert.equal(security.sanitizeBitrate('16m'), '16M');
  assert.equal(security.sanitizeBitrate('32'), '32M');
  assert.equal(security.sanitizeBitrate('128K'), '128K');
  assert.equal(security.sanitizeBitrate('invalid', '8M'), '8M');
});

test('Security Utils - Path Traversal Prevention', () => {
  const baseDir = path.resolve(__dirname, '..', 'data', 'icons');
  const safePath = security.getSafeIconPath(baseDir, 'com.spotify.music');
  assert.equal(safePath, path.join(baseDir, 'com.spotify.music.png'));

  // Strips path traversal sequences
  const attempt = security.getSafeIconPath(baseDir, '../../../../windows/system32/cmd');
  assert.equal(attempt.startsWith(baseDir), true);
});

test('Security Utils - PNG Magic Byte Validation', () => {
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  assert.equal(security.validatePngBuffer(validPngHeader), true);

  const fakeHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]); // GIF
  assert.equal(security.validatePngBuffer(fakeHeader), false);
  assert.equal(security.validatePngBuffer(Buffer.from([0x00])), false);
  assert.equal(security.validatePngBuffer('not a buffer'), false);
});

test('Scrcpy Argument Builder - Sparse and Clean Flags', () => {
  // Default minimal args
  const defaultArgs = scrcpyService.buildScrcpyArgs('192.168.1.50:5555', {});
  assert.deepEqual(defaultArgs, ['-s', '192.168.1.50:5555', '-b', '8M', '-w']);

  // Full customized profile with app launch
  const customArgs = scrcpyService.buildScrcpyArgs('89c3af9e', {
    bitRate: '16M',
    turnScreenOff: true,
    stayAwake: true,
    fullscreen: true,
    packageName: 'com.riotgames.league.wildrift',
  });
  assert.deepEqual(customArgs, [
    '-s',
    '89c3af9e',
    '-b',
    '16M',
    '-S',
    '-w',
    '-f',
    '--start-app=com.riotgames.league.wildrift',
  ]);

  // Custom flags injection check
  const withFlags = scrcpyService.buildScrcpyArgs('89c3af9e', {
    customFlags: '--keyboard=uhid --always-on-top',
  });
  assert.ok(withFlags.includes('--keyboard=uhid'));
  assert.ok(withFlags.includes('--always-on-top'));
});

test('ConfigService - Curated Library CRUD Operations', () => {
  const testPkg = 'com.test.game';

  // Add item
  const added = configService.addLibraryItem({
    packageName: testPkg,
    title: 'Test Game',
    bitRate: '16M',
    turnScreenOff: true,
  });
  assert.equal(added.packageName, testPkg);
  assert.equal(added.title, 'Test Game');
  assert.equal(added.bitRate, '16M');

  // Verify getLibrary contains it
  const lib = configService.getLibrary();
  const found = lib.find((i) => i.packageName === testPkg);
  assert.ok(found);

  // Update item
  const updated = configService.updateLibraryItem(found.id, {
    title: 'Updated Game Title',
    bitRate: '32M',
  });
  assert.equal(updated.title, 'Updated Game Title');
  assert.equal(updated.bitRate, '32M');

  // Remove item
  const removed = configService.removeLibraryItem(found.id);
  assert.equal(removed.success, true);
  const afterLib = configService.getLibrary();
  assert.equal(afterLib.some((i) => i.packageName === testPkg), false);
});

test('ADB Service - Package Name Beautifier', () => {
  assert.equal(adbService.beautifyPackageName('com.spotify.music'), 'Spotify Music');
  assert.equal(adbService.beautifyPackageName('com.riotgames.league.wildrift'), 'Riotgames League Wildrift');
  assert.equal(adbService.beautifyPackageName('org.videolan.vlc'), 'Videolan Vlc');
});
