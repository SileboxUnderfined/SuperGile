import type { PluginFormField } from '@sp/plugin-api';

export interface SuperGileConfig {
  apiKey?: string;
  host?: string;
  taskUrlTemplate?: string;
  isShowTimeTrackingDialog?: boolean;
  isShowTimeTrackingDialogForEachSubTask?: boolean;
  timeTrackingDialogDefaultTime?: string;
}

export const asConfig = (config: Record<string, unknown>): SuperGileConfig =>
  config as SuperGileConfig;

type Translate = (key: string) => string;

export const createConfigFields = (t: Translate): PluginFormField[] => [
  {
    key: 'apiKey',
    type: 'password',
    label: t('CFG.API_KEY'),
    description: t('CFG.API_KEY_DESC'),
    required: true,
  },
  {
    key: 'host',
    type: 'input',
    label: t('CFG.HOST'),
    description: t('CFG.HOST_DESC'),
    advanced: true,
  },
  {
    key: 'taskUrlTemplate',
    type: 'input',
    label: t('CFG.TASK_URL'),
    description: t('CFG.TASK_URL_DESC'),
    advanced: true,
  },
  // Well-known keys read by Super Productivity's "track time" dialog
  {
    key: 'isShowTimeTrackingDialog',
    type: 'checkbox',
    label: t('CFG.IS_SHOW_TIME_TRACKING_DIALOG'),
    description: t('CFG.IS_SHOW_TIME_TRACKING_DIALOG_DESC'),
  },
  {
    key: 'isShowTimeTrackingDialogForEachSubTask',
    type: 'checkbox',
    label: t('CFG.IS_SHOW_TIME_TRACKING_DIALOG_FOR_EACH_SUB_TASK'),
    advanced: true,
    showIf: 'isShowTimeTrackingDialog',
  },
  {
    key: 'timeTrackingDialogDefaultTime',
    type: 'select',
    label: t('CFG.DEFAULT_TIME'),
    advanced: true,
    showIf: 'isShowTimeTrackingDialog',
    options: [
      { value: 'AllTime', label: t('CFG.DEFAULT_TIME_ALL_TIME') },
      { value: 'AllTimeMinusLogged', label: t('CFG.DEFAULT_TIME_ALL_TIME_MINUS_LOGGED') },
      { value: 'TimeToday', label: t('CFG.DEFAULT_TIME_TODAY') },
      { value: 'TimeYesterday', label: t('CFG.DEFAULT_TIME_YESTERDAY') },
    ],
  },
];
