const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

test('first launch requires a separate adult confirmation and reopening does not block closing', () => {
  const hooks = [];
  let cursor = 0, accepted = 0, closed = 0;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], next => { hooks[i] = next; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    '@expo/vector-icons': { MaterialIcons: 'Icon' },
    '@/theme/theme': { colors: {}, elevation: {}, radius: {}, spacing: {}, typography: {} },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/components/legal-modal.tsx', 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: name => modules[name],
    process: { env: {
      EXPO_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
      EXPO_PUBLIC_DATA_CONTROLLER: 'Example Controller',
      EXPO_PUBLIC_PUBLISHER_NAME: 'Example Publisher',
    } },
  });
  function render(first) {
    cursor = 0;
    const wrapper = exports.LegalModal({ visible: true, isFirstLaunch: first,
      onAccept: () => accepted++, onClose: () => closed++ });
    return wrapper.type(wrapper.props);
  }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return null;
  }
  const button = tree => find(tree, node => node.props?.accessibilityLabel === 'Kabul Ediyorum ve Devam Et');
  let tree = render(true);
  assert.match(JSON.stringify(tree), /support@example\.com/);
  assert.match(JSON.stringify(tree), /Example Controller/);
  assert.match(JSON.stringify(tree), /Example Publisher/);
  assert.equal(button(tree).props.disabled, true);
  assert.equal(tree.props.onRequestClose, undefined);
  find(tree, node => node.props?.accessibilityRole === 'checkbox').props.onPress();
  tree = render(true);
  assert.equal(button(tree).props.disabled, false);
  button(tree).props.onPress();
  assert.equal(accepted, 1);
  tree = render(false);
  tree.props.onRequestClose();
  assert.equal(closed, 1);
});
