const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(readFileSync('src/components/camera-capture-modal.tsx', 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

function fixture({
  granted = true,
  takePicture = async () => ({ uri: 'file:///capture.jpg', width: 800, height: 600 }),
  inspect = async () => ({ photo: { uri: 'file:///cropped.jpg', width: 400, height: 300, privacyChecked: true } }),
} = {}) {
  const hooks = [], captured = [], alerts = [], captureOptions = [], discarded = [];
  let cursor = 0, closed = 0, requests = 0, calls = 0;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useEffect() {},
      useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
      useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], next => { hooks[i] = next; }]; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@expo/vector-icons': { Feather: 'Feather' },
    '@/theme/theme': require('../src/theme/theme.ts'),
    '@/components/photo-crop-editor': { PhotoCropEditor: 'PhotoCropEditor' },
    '@/utils/photoPrivacy': { discardPhoto: async uri => { discarded.push(uri); }, inspectPhoto: inspect },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted, canAskAgain: true }, async () => { requests++; }] },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
      Platform: { OS: 'android' }, Linking: { openSettings: async () => {} },
      StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) },
    },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => modules[name] });
  const props = { mode: 'label', onCapture: value => captured.push(value), onClose: () => { closed++; } };
  function render() { cursor = 0; return exports.CameraCaptureModal(props); }
  function find(node, match) {
    if (!node || typeof node !== 'object') return null;
    if (match(node)) return node;
    const children = [node.props?.children].flat(Infinity);
    for (const child of children) { const result = find(child, match); if (result) return result; }
    return null;
  }
  function ready() {
    const tree = render();
    const camera = find(tree, node => node.type === 'CameraView');
    camera.props.ref.current = { takePictureAsync: async (options) => { calls++; captureOptions.push(options); return takePicture(); } };
    camera.props.onCameraReady();
    return render();
  }
  const editor = () => find(render(), node => node.type === 'PhotoCropEditor');
  return { render, ready, editor, find, captured, alerts, captureOptions, discarded, get closed() { return closed; }, get calls() { return calls; }, get requests() { return requests; } };
}

const frame = { left: 0.1, top: 0.15, right: 0.9, bottom: 0.85 };
const settle = () => new Promise(resolve => setImmediate(resolve));

test('denied camera permission shows permission request without mounting a camera', async () => {
  const f = fixture({ granted: false });
  const tree = f.render();
  assert.equal(f.find(tree, node => node.type === 'CameraView'), null);
  const notice = f.find(tree, node => typeof node.props.children === 'string' && node.props.children.includes('Railway'));
  assert.match(notice.props.children, /Gönderime onay.*Cloudflare Workers AI/);
  const button = f.find(tree, node => node.type === 'Pressable' && !node.props.accessibilityLabel);
  button.props.onPress();
  assert.equal(f.requests, 1);
  assert.equal(f.calls, 0);
});

test('double capture and close during a capture do not duplicate photos or close the camera', async () => {
  let finish;
  const f = fixture({ takePicture: () => new Promise(resolve => { finish = resolve; }) });
  const tree = f.ready();
  const shutter = f.find(tree, node => node.props.accessibilityLabel === 'Fotoğraf çek');
  shutter.props.onPress();
  shutter.props.onPress();
  tree.props.onRequestClose();
  assert.equal(f.calls, 1);
  assert.equal(f.closed, 0);
  finish({ uri: 'file:///camera.jpg', width: 800, height: 600 });
  await settle();
  assert.equal(f.captured.length, 0);
  f.editor().props.onApply(frame);
  await settle();
  assert.equal(f.captured.length, 1);
  assert.equal(f.captured[0].uri, 'file:///cropped.jpg');
  assert.equal(f.captured[0].privacyChecked, true);
  assert.deepEqual(f.discarded, ['file:///camera.jpg']);
  assert.equal(f.captureOptions[0].exif, false);
});

test('capture failure releases the lock so the user can retry', async () => {
  let attempts = 0;
  const f = fixture({ takePicture: async () => { if (++attempts === 1) throw Error('busy'); return { uri: 'file:///retry.jpg', width: 1, height: 1 }; } });
  let tree = f.ready();
  f.find(tree, node => node.props.accessibilityLabel === 'Fotoğraf çek').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.alerts.length, 1);
  tree = f.render();
  f.find(tree, node => node.props.accessibilityLabel === 'Fotoğraf çek').props.onPress();
  await settle();
  f.editor().props.onApply(frame);
  await settle();
  assert.equal(f.captured.length, 1);
});

test('rejected or failed privacy scans leave the photo in the editor and never stage it', async () => {
  let checks = 0;
  const f = fixture({ inspect: async (uri, selectedFrame) => {
    assert.equal(uri, 'file:///capture.jpg');
    assert.equal(selectedFrame, frame);
    if (++checks === 1) return { issue: 'person' };
    if (checks === 2) return { issue: 'text' };
    throw new Error('scanner offline');
  } });
  f.find(f.ready(), node => node.props.accessibilityLabel === 'Fotoğraf çek').props.onPress();
  await settle();
  for (const message of [/insan görüntüsü/, /kişisel bilgi/, /tamamlanamadı/]) {
    f.editor().props.onApply(frame);
    await settle();
    assert.match(f.editor().props.message, message);
    assert.equal(f.captured.length, 0);
  }
  f.editor().props.onRetake();
  assert.equal(f.editor(), null);
  assert.deepEqual(f.discarded, ['file:///capture.jpg']);
});
