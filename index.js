// ✅ FIX 3: Buffer polyfill — required for xlsx library in React Native
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
