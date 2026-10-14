// Discord Activity: игра внутри голосового канала Discord.
// Загружается только в Discord, в остальных версиях этого кода нет.

import { DiscordSDK } from '@discord/embedded-app-sdk';
import { CONFIG, useDiscordProxy } from '../config';
import { copyText, setPlatform, web, type Platform } from './index';

export async function initDiscord(): Promise<Platform> {
  useDiscordProxy();
  const base = web('discord');
  if (!CONFIG.discordClientId) {
    setPlatform(base);
    return base;
  }
  const sdk = new DiscordSDK(CONFIG.discordClientId);
  await sdk.ready();
  let code: string | undefined;
  try {
    const r = await sdk.commands.authorize({ client_id: CONFIG.discordClientId, response_type: 'code', state: '', prompt: 'none', scope: ['identify'] });
    code = r.code;
  } catch (e) {
    console.warn('discord authorize', e);
  }
  const pf: Platform = {
    ...base,
    kind: 'discord',
    authCode: code,
    startParam: null,
    afterLogin(r) {
      if (r.discordToken) sdk.commands.authenticate({ access_token: r.discordToken }).catch(() => {});
    },
    async invite() {
      try {
        await sdk.commands.openInviteDialog();
        return true;
      } catch {
        return false;
      }
    },
    async share({ text, url }) {
      try {
        await sdk.commands.openInviteDialog();
        return 'shared';
      } catch {
        return (await copyText(`${text} ${url}`)) ? 'copied' : 'fail';
      }
    },
    openLink(url) {
      sdk.commands.openExternalLink({ url }).catch(() => {});
    },
  };
  setPlatform(pf);
  return pf;
}
