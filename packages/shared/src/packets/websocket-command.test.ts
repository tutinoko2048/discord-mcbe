/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import {
  toWebSocketCommands,
  WebSocketChunkAssembler,
  WEBSOCKET_COMMAND_MAX_BYTES,
} from './websocket-command';

const CHUNK_PREFIX = 'scriptevent bridge:chunk ';

function deliver(commands: string[], assembler = new WebSocketChunkAssembler()): string | undefined {
  let result: string | undefined;
  for (const command of commands) {
    expect(command.startsWith(CHUNK_PREFIX)).toBe(true);
    // The add-on trims the event message, as the game may drop spaces around it.
    result = assembler.push(command.slice(CHUNK_PREFIX.length).trim());
  }
  return result;
}

describe('commands sent over WebSocket', () => {
  test('sends a small packet in one command', () => {
    expect(toWebSocketCommands('{"type":"ping"}', '1')).toEqual([
      'scriptevent bridge:message {"type":"ping"}',
    ]);
  });

  test('splits a large packet and restores it', () => {
    const json = JSON.stringify({ text: '§9[Discord]§r <日本語の名前> ' + 'あ  い 😀 '.repeat(200) });
    const commands = toWebSocketCommands(json, '7');

    expect(commands.length).toBeGreaterThan(1);
    for (const command of commands) {
      expect(new TextEncoder().encode(command).length).toBeLessThanOrEqual(WEBSOCKET_COMMAND_MAX_BYTES);
    }
    expect(deliver(commands)).toBe(json);
  });

  test('keeps spaces at the edges of a chunk', () => {
    const json = JSON.stringify({ text: ' '.repeat(1000) });
    expect(deliver(toWebSocketCommands(json, '1'))).toBe(json);
  });

  test('restores messages whose chunks are interleaved', () => {
    const first = JSON.stringify({ text: 'a'.repeat(900) });
    const second = JSON.stringify({ text: 'b'.repeat(900) });
    const a = toWebSocketCommands(first, '1');
    const b = toWebSocketCommands(second, '2');
    const assembler = new WebSocketChunkAssembler();

    expect(deliver([a[0]!, b[0]!], assembler)).toBeUndefined();
    expect(deliver(a.slice(1), assembler)).toBe(first);
    expect(deliver(b.slice(1), assembler)).toBe(second);
  });

  test('ignores malformed chunks and forgets unfinished messages', () => {
    const assembler = new WebSocketChunkAssembler();
    expect(assembler.push('not a chunk')).toBeUndefined();
    expect(assembler.push('1:5:2:x|')).toBeUndefined();

    const commands = toWebSocketCommands(JSON.stringify({ text: 'a'.repeat(900) }), '1');
    deliver(commands.slice(0, 1), assembler);
    assembler.clear();
    expect(deliver(commands.slice(1), assembler)).toBeUndefined();
  });
});
