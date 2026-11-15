import { describe, expect, it } from 'bun:test';
import { formatChatDisplay } from './chat-format';

describe('formatChatDisplay', () => {
  it('returns the name and message unchanged without formatting', () => {
    expect(formatChatDisplay({ senderName: 'Steve', message: 'hello', stripColor: true })).toEqual({
      senderName: 'Steve',
      message: 'hello',
      name: 'Steve',
      namePrefix: '',
      nameSuffix: '',
    });
  });

  it('wraps the name and the message with their prefix and suffix', () => {
    expect(
      formatChatDisplay({
        senderName: 'Steve',
        message: 'hello',
        formatting: { namePrefix: '[JP] ', nameSuffix: ' (VIP)', messagePrefix: '> ', messageSuffix: ' <' },
        stripColor: false,
      }),
    ).toEqual({
      senderName: '[JP] Steve (VIP)',
      message: '> hello <',
      name: 'Steve',
      namePrefix: '[JP] ',
      nameSuffix: ' (VIP)',
    });
  });

  it('removes color codes from formatting and message when stripping is enabled', () => {
    expect(
      formatChatDisplay({
        senderName: 'Steve',
        message: '§ahello',
        formatting: { namePrefix: '[§bJP§r] ', nameSuffix: '§r', messagePrefix: '§e' },
        stripColor: true,
      }),
    ).toEqual({
      senderName: '[JP] Steve',
      message: 'hello',
      name: 'Steve',
      namePrefix: '[JP] ',
      nameSuffix: '',
    });
  });

  it('keeps color codes when stripping is disabled', () => {
    expect(
      formatChatDisplay({
        senderName: 'Steve',
        message: '§ahello',
        formatting: { namePrefix: '§b' },
        stripColor: false,
      }),
    ).toEqual({
      senderName: '§bSteve',
      message: '§ahello',
      name: 'Steve',
      namePrefix: '§b',
      nameSuffix: '',
    });
  });
});
