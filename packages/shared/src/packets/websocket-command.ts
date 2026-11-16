// Over WebSocket the server reaches the add-on by running `scriptevent` commands as the player.
// The game disconnects a player whose command is too long, so a large packet is sent in several commands.

export const WEBSOCKET_MESSAGE_EVENT = 'bridge:message';
export const WEBSOCKET_CHUNK_EVENT = 'bridge:chunk';

/**
 * Longest command sent over WebSocket, in UTF-8 bytes.
 *
 * Measured on 1.26.63: a command of 445 bytes is accepted and one of 448 disconnects the player.
 * The game counts bytes, not characters: 164 three-byte characters (448 bytes) disconnect as well.
 * Characters escaped in the JSON request do not count twice: a command with 425 quotes is accepted.
 */
export const WEBSOCKET_COMMAND_MAX_BYTES = 400;

/** Closes every chunk, so the game cannot trim spaces at the end of a part. */
const CHUNK_END = '|';
/** Room for `<id>:<index>:<total>:` and the end mark. */
const CHUNK_HEADER_BYTES = 40;
/** Messages left unfinished, for example by a disconnect, are dropped beyond this number. */
const MAX_PARTIAL_MESSAGES = 16;

function utf8Length(char: string): number {
  const code = char.codePointAt(0)!;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  return code < 0x10000 ? 3 : 4;
}

function byteLength(text: string): number {
  let length = 0;
  for (const char of text) length += utf8Length(char);
  return length;
}

function splitByBytes(text: string, maxBytes: number): string[] {
  const parts: string[] = [];
  let part = '';
  let length = 0;
  for (const char of text) {
    const size = utf8Length(char);
    if (length + size > maxBytes && part) {
      parts.push(part);
      part = '';
      length = 0;
    }
    part += char;
    length += size;
  }
  if (part) parts.push(part);
  return parts;
}

/**
 * Turns a serialized packet into the commands that deliver it.
 * @param id Tells apart messages whose chunks are in flight at the same time.
 */
export function toWebSocketCommands(
  json: string,
  id: string,
  maxBytes: number = WEBSOCKET_COMMAND_MAX_BYTES,
): string[] {
  const whole = `scriptevent ${WEBSOCKET_MESSAGE_EVENT} ${json}`;
  if (byteLength(whole) <= maxBytes) return [whole];

  const prefix = `scriptevent ${WEBSOCKET_CHUNK_EVENT} `;
  const parts = splitByBytes(json, maxBytes - byteLength(prefix) - CHUNK_HEADER_BYTES);
  return parts.map((part, index) => `${prefix}${id}:${index}:${parts.length}:${part}${CHUNK_END}`);
}

/** Puts the chunks made by {@link toWebSocketCommands} back together. */
export class WebSocketChunkAssembler {
  private readonly partial = new Map<string, { parts: string[]; received: number }>();

  /** Takes the message of one chunk event. Returns the serialized packet once all of its chunks arrived. */
  push(chunk: string): string | undefined {
    const match = /^([^:]+):(\d+):(\d+):([\s\S]*)\|$/.exec(chunk);
    if (!match) return undefined;

    const [, id, indexText, totalText, part] = match as unknown as [string, string, string, string, string];
    const index = Number(indexText);
    const total = Number(totalText);
    if (index >= total) return undefined;

    let message = this.partial.get(id);
    if (!message || message.parts.length !== total) {
      message = { parts: Array.from<string>({ length: total }), received: 0 };
      this.partial.set(id, message);
      if (this.partial.size > MAX_PARTIAL_MESSAGES) {
        this.partial.delete(this.partial.keys().next().value!);
      }
    }

    if (message.parts[index] === undefined) message.received++;
    message.parts[index] = part;
    if (message.received < total) return undefined;

    this.partial.delete(id);
    return message.parts.join('');
  }

  clear(): void {
    this.partial.clear();
  }
}
