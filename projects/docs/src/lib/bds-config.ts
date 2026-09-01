import manifest from '../../../addon-bds/manifest.json';

const scriptModule = manifest.modules?.find(
  (module) => module.type === 'script' && typeof module.uuid === 'string',
);

if (!scriptModule?.uuid) {
  throw new Error('BDS script module UUID is missing from manifest.json');
}

export const BDS_SCRIPT_MODULE_UUID = scriptModule.uuid;
