// Entry point of the SuperGile plugin: registers YouGile as an issue
// provider in Super Productivity.
import type { PluginAPI as PluginAPIType } from '@sp/plugin-api';
import { createDefinition } from './provider/definition';

declare const PluginAPI: PluginAPIType;

/** Translates a key from i18n/*.json, falling back to the key itself. */
const t = (key: string): string => {
  try {
    return PluginAPI.translate(key);
  } catch {
    return key;
  }
};

PluginAPI.registerIssueProvider(createDefinition(t));
