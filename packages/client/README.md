# @discord-mcbe/client

Script API client for connecting a Minecraft Bedrock add-on to a discord-mcbe server.

This package is intended to be bundled into your add-on. Use the entry point that matches the environment where the add-on runs.

## Installation

```sh
npm install @discord-mcbe/client
```

## Regular worlds

Import `@discord-mcbe/client/local` and create a `BridgeClient` in your add-on's entry point:

```ts
import { BridgeClient } from '@discord-mcbe/client/local';

new BridgeClient({
  worldName: 'My World',
});
```

The local client listens for a connection from the discord-mcbe server. The server provides the connection command when it starts; run that command in Minecraft to connect the world.

`worldName` is optional and defaults to `World`. It can also be a function that returns the current world name.

## Bedrock Dedicated Server

Import `@discord-mcbe/client/bds` and start the client after creating it:

```ts
import { BridgeClient } from '@discord-mcbe/client/bds';

const client = new BridgeClient({
  url: 'ws://localhost:23191',
  worldName: 'My Server',
});

client.start().catch((error) => {
  console.error('[my-addon] Failed to connect to discord-mcbe:', error);
});
```

The default URL is `ws://localhost:23191`. Set `token` when the discord-mcbe server is configured to authenticate BDS connections:

```ts
const client = new BridgeClient({
  token: 'your-token',
});
```

`worldName` is optional and defaults to `Server`. It can also be a function that returns the current world name.

## Built-in behavior

Creating a `BridgeClient` registers the client's event forwarding and these commands:

- `/dmc:dmc` and `/dmc:discord-mcbe` — open the settings form
- `/dmc:setname <worldName>` — save the world name
- `/dmc:disconnect` — disconnect the bridge

The client forwards player joins, leaves, deaths, and chat messages to the discord-mcbe server when connected.

Use only one client instance per add-on entry point.

## Compatibility

The add-on must use the Minecraft Script API versions required by this package, including:

- `@minecraft/server`
- `@minecraft/server-ui`
- `@minecraft/server-net` for the BDS entry point

The add-on build must bundle this package into its script files; Minecraft does not resolve npm package imports at runtime.
