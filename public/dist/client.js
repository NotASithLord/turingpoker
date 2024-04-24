new EventSource('http://127.0.0.1:55523/esbuild').addEventListener('change', () => location.reload())
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/partysocket/dist/chunk-KZ3GGBVP.mjs
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}
function cloneEventBrowser(e) {
  return new e.constructor(e.type, e);
}
function cloneEventNode(e) {
  if ("data" in e) {
    const evt2 = new MessageEvent(e.type, e);
    return evt2;
  }
  if ("code" in e || "reason" in e) {
    const evt2 = new CloseEvent(
      // @ts-expect-error we need to fix event/listener types
      e.code || 1999,
      // @ts-expect-error we need to fix event/listener types
      e.reason || "unknown reason",
      e
    );
    return evt2;
  }
  if ("error" in e) {
    const evt2 = new ErrorEvent(e.error, e);
    return evt2;
  }
  const evt = new Event(e.type, e);
  return evt;
}
var ErrorEvent, CloseEvent, Events, isNode, cloneEvent, DEFAULT, didWarnAboutMissingWebSocket, ReconnectingWebSocket;
var init_chunk_KZ3GGBVP = __esm({
  "node_modules/partysocket/dist/chunk-KZ3GGBVP.mjs"() {
    if (!globalThis.EventTarget || !globalThis.Event) {
      console.error(`
  PartySocket requires a global 'EventTarget' class to be available!
  You can polyfill this global by adding this to your code before any partysocket imports: 
  
  \`\`\`
  import 'partysocket/event-target-polyfill';
  \`\`\`
  Please file an issue at https://github.com/partykit/partykit if you're still having trouble.
`);
    }
    ErrorEvent = class extends Event {
      message;
      error;
      constructor(error, target) {
        super("error", target);
        this.message = error.message;
        this.error = error;
      }
    };
    CloseEvent = class extends Event {
      code;
      reason;
      wasClean = true;
      constructor(code = 1e3, reason = "", target) {
        super("close", target);
        this.code = code;
        this.reason = reason;
      }
    };
    Events = {
      Event,
      ErrorEvent,
      CloseEvent
    };
    isNode = typeof process !== "undefined" && typeof process.versions?.node !== "undefined" && typeof document === "undefined";
    cloneEvent = isNode ? cloneEventNode : cloneEventBrowser;
    DEFAULT = {
      maxReconnectionDelay: 1e4,
      minReconnectionDelay: 1e3 + Math.random() * 4e3,
      minUptime: 5e3,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 4e3,
      maxRetries: Infinity,
      maxEnqueuedMessages: Infinity,
      startClosed: false,
      debug: false
    };
    didWarnAboutMissingWebSocket = false;
    ReconnectingWebSocket = class _ReconnectingWebSocket extends EventTarget {
      _ws;
      _retryCount = -1;
      _uptimeTimeout;
      _connectTimeout;
      _shouldReconnect = true;
      _connectLock = false;
      _binaryType = "blob";
      _closeCalled = false;
      _messageQueue = [];
      _debugLogger = console.log.bind(console);
      _url;
      _protocols;
      _options;
      constructor(url, protocols, options = {}) {
        super();
        this._url = url;
        this._protocols = protocols;
        this._options = options;
        if (this._options.startClosed) {
          this._shouldReconnect = false;
        }
        if (this._options.debugLogger) {
          this._debugLogger = this._options.debugLogger;
        }
        this._connect();
      }
      static get CONNECTING() {
        return 0;
      }
      static get OPEN() {
        return 1;
      }
      static get CLOSING() {
        return 2;
      }
      static get CLOSED() {
        return 3;
      }
      get CONNECTING() {
        return _ReconnectingWebSocket.CONNECTING;
      }
      get OPEN() {
        return _ReconnectingWebSocket.OPEN;
      }
      get CLOSING() {
        return _ReconnectingWebSocket.CLOSING;
      }
      get CLOSED() {
        return _ReconnectingWebSocket.CLOSED;
      }
      get binaryType() {
        return this._ws ? this._ws.binaryType : this._binaryType;
      }
      set binaryType(value) {
        this._binaryType = value;
        if (this._ws) {
          this._ws.binaryType = value;
        }
      }
      /**
       * Returns the number or connection retries
       */
      get retryCount() {
        return Math.max(this._retryCount, 0);
      }
      /**
       * The number of bytes of data that have been queued using calls to send() but not yet
       * transmitted to the network. This value resets to zero once all queued data has been sent.
       * This value does not reset to zero when the connection is closed; if you keep calling send(),
       * this will continue to climb. Read only
       */
      get bufferedAmount() {
        const bytes = this._messageQueue.reduce((acc, message) => {
          if (typeof message === "string") {
            acc += message.length;
          } else if (message instanceof Blob) {
            acc += message.size;
          } else {
            acc += message.byteLength;
          }
          return acc;
        }, 0);
        return bytes + (this._ws ? this._ws.bufferedAmount : 0);
      }
      /**
       * The extensions selected by the server. This is currently only the empty string or a list of
       * extensions as negotiated by the connection
       */
      get extensions() {
        return this._ws ? this._ws.extensions : "";
      }
      /**
       * A string indicating the name of the sub-protocol the server selected;
       * this will be one of the strings specified in the protocols parameter when creating the
       * WebSocket object
       */
      get protocol() {
        return this._ws ? this._ws.protocol : "";
      }
      /**
       * The current state of the connection; this is one of the Ready state constants
       */
      get readyState() {
        if (this._ws) {
          return this._ws.readyState;
        }
        return this._options.startClosed ? _ReconnectingWebSocket.CLOSED : _ReconnectingWebSocket.CONNECTING;
      }
      /**
       * The URL as resolved by the constructor
       */
      get url() {
        return this._ws ? this._ws.url : "";
      }
      /**
       * Whether the websocket object is now in reconnectable state
       */
      get shouldReconnect() {
        return this._shouldReconnect;
      }
      /**
       * An event listener to be called when the WebSocket connection's readyState changes to CLOSED
       */
      onclose = null;
      /**
       * An event listener to be called when an error occurs
       */
      onerror = null;
      /**
       * An event listener to be called when a message is received from the server
       */
      onmessage = null;
      /**
       * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
       * this indicates that the connection is ready to send and receive data
       */
      onopen = null;
      /**
       * Closes the WebSocket connection or connection attempt, if any. If the connection is already
       * CLOSED, this method does nothing
       */
      close(code = 1e3, reason) {
        this._closeCalled = true;
        this._shouldReconnect = false;
        this._clearTimeouts();
        if (!this._ws) {
          this._debug("close enqueued: no ws instance");
          return;
        }
        if (this._ws.readyState === this.CLOSED) {
          this._debug("close: already closed");
          return;
        }
        this._ws.close(code, reason);
      }
      /**
       * Closes the WebSocket connection or connection attempt and connects again.
       * Resets retry counter;
       */
      reconnect(code, reason) {
        this._shouldReconnect = true;
        this._closeCalled = false;
        this._retryCount = -1;
        if (!this._ws || this._ws.readyState === this.CLOSED) {
          this._connect();
        } else {
          this._disconnect(code, reason);
          this._connect();
        }
      }
      /**
       * Enqueue specified data to be transmitted to the server over the WebSocket connection
       */
      send(data) {
        if (this._ws && this._ws.readyState === this.OPEN) {
          this._debug("send", data);
          this._ws.send(data);
        } else {
          const { maxEnqueuedMessages = DEFAULT.maxEnqueuedMessages } = this._options;
          if (this._messageQueue.length < maxEnqueuedMessages) {
            this._debug("enqueue", data);
            this._messageQueue.push(data);
          }
        }
      }
      _debug(...args) {
        if (this._options.debug) {
          this._debugLogger("RWS>", ...args);
        }
      }
      _getNextDelay() {
        const {
          reconnectionDelayGrowFactor = DEFAULT.reconnectionDelayGrowFactor,
          minReconnectionDelay = DEFAULT.minReconnectionDelay,
          maxReconnectionDelay = DEFAULT.maxReconnectionDelay
        } = this._options;
        let delay = 0;
        if (this._retryCount > 0) {
          delay = minReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, this._retryCount - 1);
          if (delay > maxReconnectionDelay) {
            delay = maxReconnectionDelay;
          }
        }
        this._debug("next delay", delay);
        return delay;
      }
      _wait() {
        return new Promise((resolve) => {
          setTimeout(resolve, this._getNextDelay());
        });
      }
      _getNextProtocols(protocolsProvider) {
        if (!protocolsProvider)
          return Promise.resolve(null);
        if (typeof protocolsProvider === "string" || Array.isArray(protocolsProvider)) {
          return Promise.resolve(protocolsProvider);
        }
        if (typeof protocolsProvider === "function") {
          const protocols = protocolsProvider();
          if (!protocols)
            return Promise.resolve(null);
          if (typeof protocols === "string" || Array.isArray(protocols)) {
            return Promise.resolve(protocols);
          }
          if (protocols.then) {
            return protocols;
          }
        }
        throw Error("Invalid protocols");
      }
      _getNextUrl(urlProvider) {
        if (typeof urlProvider === "string") {
          return Promise.resolve(urlProvider);
        }
        if (typeof urlProvider === "function") {
          const url = urlProvider();
          if (typeof url === "string") {
            return Promise.resolve(url);
          }
          if (url.then) {
            return url;
          }
        }
        throw Error("Invalid URL");
      }
      _connect() {
        if (this._connectLock || !this._shouldReconnect) {
          return;
        }
        this._connectLock = true;
        const {
          maxRetries = DEFAULT.maxRetries,
          connectionTimeout = DEFAULT.connectionTimeout
        } = this._options;
        if (this._retryCount >= maxRetries) {
          this._debug("max retries reached", this._retryCount, ">=", maxRetries);
          return;
        }
        this._retryCount++;
        this._debug("connect", this._retryCount);
        this._removeListeners();
        this._wait().then(
          () => Promise.all([
            this._getNextUrl(this._url),
            this._getNextProtocols(this._protocols || null)
          ])
        ).then(([url, protocols]) => {
          if (this._closeCalled) {
            this._connectLock = false;
            return;
          }
          if (!this._options.WebSocket && typeof WebSocket === "undefined" && !didWarnAboutMissingWebSocket) {
            console.error(`\u203C\uFE0F No WebSocket implementation available. You should define options.WebSocket. 

For example, if you're using node.js, run \`npm install ws\`, and then in your code:

import PartySocket from 'partysocket';
import WS from 'ws';

const partysocket = new PartySocket({
  host: "127.0.0.1:1999",
  room: "test-room",
  WebSocket: WS
});

`);
            didWarnAboutMissingWebSocket = true;
          }
          const WS = this._options.WebSocket || WebSocket;
          this._debug("connect", { url, protocols });
          this._ws = protocols ? new WS(url, protocols) : new WS(url);
          this._ws.binaryType = this._binaryType;
          this._connectLock = false;
          this._addListeners();
          this._connectTimeout = setTimeout(
            () => this._handleTimeout(),
            connectionTimeout
          );
        }).catch((err) => {
          this._connectLock = false;
          this._handleError(new Events.ErrorEvent(Error(err.message), this));
        });
      }
      _handleTimeout() {
        this._debug("timeout event");
        this._handleError(new Events.ErrorEvent(Error("TIMEOUT"), this));
      }
      _disconnect(code = 1e3, reason) {
        this._clearTimeouts();
        if (!this._ws) {
          return;
        }
        this._removeListeners();
        try {
          this._ws.close(code, reason);
          this._handleClose(new Events.CloseEvent(code, reason, this));
        } catch (error) {
        }
      }
      _acceptOpen() {
        this._debug("accept open");
        this._retryCount = 0;
      }
      _handleOpen = (event) => {
        this._debug("open event");
        const { minUptime = DEFAULT.minUptime } = this._options;
        clearTimeout(this._connectTimeout);
        this._uptimeTimeout = setTimeout(() => this._acceptOpen(), minUptime);
        assert(this._ws, "WebSocket is not defined");
        this._ws.binaryType = this._binaryType;
        this._messageQueue.forEach((message) => this._ws?.send(message));
        this._messageQueue = [];
        if (this.onopen) {
          this.onopen(event);
        }
        this.dispatchEvent(cloneEvent(event));
      };
      _handleMessage = (event) => {
        this._debug("message event");
        if (this.onmessage) {
          this.onmessage(event);
        }
        this.dispatchEvent(cloneEvent(event));
      };
      _handleError = (event) => {
        this._debug("error event", event.message);
        this._disconnect(
          void 0,
          event.message === "TIMEOUT" ? "timeout" : void 0
        );
        if (this.onerror) {
          this.onerror(event);
        }
        this._debug("exec error listeners");
        this.dispatchEvent(cloneEvent(event));
        this._connect();
      };
      _handleClose = (event) => {
        this._debug("close event");
        this._clearTimeouts();
        if (this._shouldReconnect) {
          this._connect();
        }
        if (this.onclose) {
          this.onclose(event);
        }
        this.dispatchEvent(cloneEvent(event));
      };
      _removeListeners() {
        if (!this._ws) {
          return;
        }
        this._debug("removeListeners");
        this._ws.removeEventListener("open", this._handleOpen);
        this._ws.removeEventListener("close", this._handleClose);
        this._ws.removeEventListener("message", this._handleMessage);
        this._ws.removeEventListener("error", this._handleError);
      }
      _addListeners() {
        if (!this._ws) {
          return;
        }
        this._debug("addListeners");
        this._ws.addEventListener("open", this._handleOpen);
        this._ws.addEventListener("close", this._handleClose);
        this._ws.addEventListener("message", this._handleMessage);
        this._ws.addEventListener("error", this._handleError);
      }
      _clearTimeouts() {
        clearTimeout(this._connectTimeout);
        clearTimeout(this._uptimeTimeout);
      }
    };
  }
});

// node_modules/partysocket/dist/chunk-G2EOJEOR.mjs
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  let d = (/* @__PURE__ */ new Date()).getTime();
  let d2 = typeof performance !== "undefined" && performance.now && performance.now() * 1e3 || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function getPartyInfo(partySocketOptions, defaultProtocol, defaultParams = {}) {
  const {
    host: rawHost,
    path: rawPath,
    protocol: rawProtocol,
    room,
    party,
    query
  } = partySocketOptions;
  let host = rawHost.replace(/^(http|https|ws|wss):\/\//, "");
  if (host.endsWith("/")) {
    host = host.slice(0, -1);
  }
  if (rawPath && rawPath.startsWith("/")) {
    throw new Error("path must not start with a slash");
  }
  const name = party ?? "main";
  const path = rawPath ? `/${rawPath}` : "";
  const protocol = rawProtocol || (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.") && host.split(".")[1] >= "16" && host.split(".")[1] <= "31" || host.startsWith("[::ffff:7f00:1]:") ? (
    // http / ws
    defaultProtocol
  ) : (
    // https / wss
    defaultProtocol + "s"
  ));
  const baseUrl = `${protocol}://${host}/${party ? `parties/${party}` : "party"}/${room}${path}`;
  const makeUrl = (query2 = {}) => `${baseUrl}?${new URLSearchParams([
    ...Object.entries(defaultParams),
    ...Object.entries(query2).filter(valueIsNotNil)
  ])}`;
  const urlProvider = typeof query === "function" ? async () => makeUrl(await query()) : makeUrl(query);
  return {
    host,
    path,
    room,
    name,
    protocol,
    partyUrl: baseUrl,
    urlProvider
  };
}
function getWSOptions(partySocketOptions) {
  const {
    id,
    host: _host,
    path: _path,
    party: _party,
    room: _room,
    protocol: _protocol,
    query: _query,
    protocols,
    ...socketOptions
  } = partySocketOptions;
  const _pk = id || generateUUID();
  const party = getPartyInfo(partySocketOptions, "ws", { _pk });
  return {
    _pk,
    _pkurl: party.partyUrl,
    name: party.name,
    room: party.room,
    host: party.host,
    path: party.path,
    protocols,
    socketOptions,
    urlProvider: party.urlProvider
  };
}
var valueIsNotNil, PartySocket;
var init_chunk_G2EOJEOR = __esm({
  "node_modules/partysocket/dist/chunk-G2EOJEOR.mjs"() {
    init_chunk_KZ3GGBVP();
    valueIsNotNil = (keyValuePair) => keyValuePair[1] !== null && keyValuePair[1] !== void 0;
    PartySocket = class extends ReconnectingWebSocket {
      constructor(partySocketOptions) {
        const wsOptions = getWSOptions(partySocketOptions);
        super(wsOptions.urlProvider, wsOptions.protocols, wsOptions.socketOptions);
        this.partySocketOptions = partySocketOptions;
        this.setWSProperties(wsOptions);
      }
      _pk;
      _pkurl;
      name;
      room;
      host;
      path;
      updateProperties(partySocketOptions) {
        const wsOptions = getWSOptions({
          ...this.partySocketOptions,
          ...partySocketOptions,
          host: partySocketOptions.host ?? this.host,
          room: partySocketOptions.room ?? this.room,
          path: partySocketOptions.path ?? this.path
        });
        this._url = wsOptions.urlProvider;
        this._protocols = wsOptions.protocols;
        this._options = wsOptions.socketOptions;
        this.setWSProperties(wsOptions);
      }
      setWSProperties(wsOptions) {
        const { _pk, _pkurl, name, room, host, path } = wsOptions;
        this._pk = _pk;
        this._pkurl = _pkurl;
        this.name = name;
        this.room = room;
        this.host = host;
        this.path = path;
      }
      reconnect(code, reason) {
        if (!this.room || !this.host) {
          throw new Error(
            "The room and host must be set before connecting, use `updateProperties` method to set them or pass them to the constructor."
          );
        }
        super.reconnect(code, reason);
      }
      get id() {
        return this._pk;
      }
      /**
       * Exposes the static PartyKit room URL without applying query parameters.
       * To access the currently connected WebSocket url, use PartySocket#url.
       */
      get roomUrl() {
        return this._pkurl;
      }
      // a `fetch` method that uses (almost) the same options as `PartySocket`
      static async fetch(options, init) {
        const party = getPartyInfo(options, "http");
        const url = typeof party.urlProvider === "string" ? party.urlProvider : await party.urlProvider();
        const doFetch = options.fetch ?? fetch;
        return doFetch(url, init);
      }
    };
  }
});

// node_modules/partysocket/dist/index.mjs
var init_dist = __esm({
  "node_modules/partysocket/dist/index.mjs"() {
    init_chunk_G2EOJEOR();
    init_chunk_KZ3GGBVP();
  }
});

// public/images/logo.png
var logo_default;
var init_logo = __esm({
  "public/images/logo.png"() {
    logo_default = "./logo-3GWBX3UE.png";
  }
});

// src/utils/string_utilities.js
function getImagePath(image = "") {
  return image.replace("./", "dist/");
}
var init_string_utilities = __esm({
  "src/utils/string_utilities.js"() {
  }
});

// src/components/header.js
var header_default;
var init_header = __esm({
  "src/components/header.js"() {
    init_logo();
    init_string_utilities();
    header_default = {
      view: (vnode) => {
        console.log(vnode);
        return m(
          "div",
          {
            class: "tg-header"
          },
          [
            m(
              "div",
              {
                class: "tg-header__logo",
                style: { left: "12px" }
              },
              m("img", {
                src: getImagePath(logo_default)
              })
            ),
            // text
            m("div.tg-header__title", [
              m("h2", `Table: ${vnode.attrs.gameType}`),
              m("p", "Turing Games")
            ]),
            m(
              "div",
              {
                class: "tg-header__logo",
                style: { right: "12px" }
              },
              m("img", {
                src: getImagePath(logo_default)
              })
            ),
            ...Array(4).fill("_").map((el, i) => {
              return m("div", {
                class: `tg-header__squares tg-header__squares--${i}`
              });
            })
          ]
        );
      }
    };
  }
});

// src/client.js
var require_client = __commonJS({
  "src/client.js"(exports) {
    init_dist();
    init_header();
    var gameState = {
      isConnected: false,
      gameData: null,
      socket: null,
      playerId: null,
      // This will store the client's player ID
      connect: () => {
        exports.socket = new PartySocket({
          host: "127.0.0.1:1999",
          room: "my-new-room"
        });
        exports.socket.addEventListener("open", () => {
          gameState.isConnected = true;
          gameState.playerId = exports.socket.id;
          console.log("Connected with ID:", exports.playerId);
          console.log(gameState.playerId);
          m.redraw();
        });
        exports.socket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(event.data);
            gameState.gameData = data;
          } catch {
            gameState.gameData = event.data;
          }
          m.redraw();
        });
        exports.socket.addEventListener("close", () => {
          exports.isConnected = false;
          console.log("WebSocket closed");
          m.redraw();
        });
        exports.socket.addEventListener("error", (event) => {
          console.error("WebSocket error:", event);
        });
      },
      sendAction: (action, amount = 0) => {
        if (exports.socket && exports.socket.readyState === WebSocket.OPEN) {
          exports.socket.send(JSON.stringify({ action, amount }));
        } else {
          console.error("WebSocket is not initialized or not open.");
        }
      }
    };
    var GameControls = {
      view: () => {
        console.log("here is the bug");
        console.log(gameState.isConnected);
        console.log(!gameState.gameData);
        if (!gameState.isConnected || !gameState.gameData) {
          return m("p", "Waiting for the game to start or connect...");
        }
        console.log(gameState.gameData.currentPlayer);
        console.log(gameState.playerId);
        const isCurrentPlayerTurn = gameState.gameData.players[gameState.gameData.currentPlayer].playerId === gameState.playerId;
        if (!isCurrentPlayerTurn) {
          return m("p", "Waiting for your turn...");
        }
        const currentBet = gameState.gameData.bettingRound.currentBet;
        const minRaiseAmount = currentBet > 0 ? currentBet + gameState.gameData.bigBlind : gameState.gameData.bigBlind;
        return m("div", [
          currentBet > 0 ? m("button", {
            onclick: () => gameState.sendAction("call", currentBet)
          }, "Call") : null,
          m("button", {
            onclick: () => gameState.sendAction("check"),
            disabled: currentBet > 0
          }, "Check"),
          m("button", {
            onclick: () => {
              const amount = prompt(`Enter amount to raise (minimum: $${minRaiseAmount}):`, minRaiseAmount);
              if (amount && parseInt(amount, 10) >= minRaiseAmount) {
                gameState.sendAction("raise", parseInt(amount, 10));
              } else {
                alert(`Invalid raise amount. You must raise at least $${minRaiseAmount}.`);
              }
            }
          }, "Raise"),
          m("button", {
            onclick: () => gameState.sendAction("fold")
          }, "Fold")
        ]);
      }
    };
    var App = {
      oninit: gameState.connect,
      view: () => {
        const currentPlayer = gameState?.gameData?.players?.find((player) => gameState?.playerId);
        if (!gameState.gameData) {
          return m("p", "Loading...");
        }
        return m("div", [
          m(header_default, {
            gameType: gameState.gameData.gameType
          }),
          typeof gameState.gameData === "string" ? m("p", gameState.gameData) : m("div", [
            m("div", `Current Pot: $${gameState.gameData.potTotal}`),
            m("div", `Current Bet: $${gameState.gameData.bettingRound.currentBet}`),
            m("div", `Dealer Position: Player ${gameState.gameData.dealerPosition + 1}`),
            m("h3", "You:"),
            m("div.player", {
              class: "current-player"
            }, [
              m("h4", `Player ${index + 1} (${currentPlayer.status}) ${currentPlayer.playerId === gameState.gameData.players[gameState.gameData.currentPlayer].playerId ? " - Your Turn" : ""}`),
              m("div", `Stack: $${currentPlayer.stackSize}`),
              m("div", `Current Bet: $${currentPlayer.currentBet}`),
              m("div", `Cards: ${currentPlayer.cards.join(", ")}`)
            ]),
            // gameState.gameData.players.map((player, index) =>
            // m("div.player", {
            //   class: gameState.playerId === player.playerId ? 'current-player' : ''
            // }, [
            //   m("h4", `Player ${index + 1} (${player.status}) ${player.playerId === gameState.gameData.players[gameState.gameData.currentPlayer].playerId ? ' - Your Turn' : ''}`),
            //   m("div", `Stack: $${player.stackSize}`),
            //   m("div", `Current Bet: $${player.currentBet}`),
            //   m("div", `Cards: ${player.cards.join(', ')}`),
            //   gameState.playerId === player.playerId ? m("div", "This is You") : null
            // ])
            // ),
            m("h3", "Spectators:"),
            gameState.gameData.spectators.map(
              (spectator, index2) => m("div.spectator", [
                m("h4", `Spectator ${index2 + 1}`),
                m("div", `Status: ${spectator.status}`)
              ])
            )
          ]),
          m(GameControls)
          // Render game controls as a child component
        ]);
      }
    };
    m.mount(document.getElementById("app"), App);
  }
});
export default require_client();
/*! Bundled license information:

partysocket/dist/chunk-KZ3GGBVP.mjs:
  (*!
   * Reconnecting WebSocket
   * by Pedro Ladaria <pedro.ladaria@gmail.com>
   * https://github.com/pladaria/reconnecting-websocket
   * License MIT
   *)
*/
//# sourceMappingURL=client.js.map
