const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
};
config.resolver.blockList = [
  new RegExp(
    `^${escapeRegExp(path.join(workspaceNodeModules, 'react'))}([\\\\/].*)?$`
  ),
  new RegExp(
    `^${escapeRegExp(path.join(workspaceNodeModules, 'react-native'))}([\\\\/].*)?$`
  ),
  new RegExp(
    `^${escapeRegExp(path.join(workspaceNodeModules, 'react-dom'))}([\\\\/].*)?$`
  ),
];

module.exports = config;
