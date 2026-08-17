// Web runtime for the Metro bundler (fast refresh, URL handling). No-op on native.
import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
