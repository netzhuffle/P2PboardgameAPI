import Bottle from 'bottlejs';
/**
 * @external {DataChannel} https://github.com/muaz-khan/DataChannel
 * @protected
 */
// datachannel sets DataChannel to a global variable, so use webpack’s export-loader to import:
/* eslint import/no-unresolved: [2, { ignore: ['exports\?DataChannel!datachannel'] }] */
import DataChannel from 'exports?DataChannel!datachannel';
/**
 * @external {Signal} http://millermedeiros.github.io/js-signals/docs/symbols/Signal.html
 * @protected
 */
import Signal from 'signals';
/**
 * @external {CypherPokerGame} https://cypherpoker.github.io/cypherpoker-js/#game
 * @protected
 */
/**
 * @external {CypherPokerPlayer} https://cypherpoker.github.io/cypherpoker-js/#player
 * @protected
 */
/**
 * @external {CypherPokerDeck} https://cypherpoker.github.io/cypherpoker-js/#deck
 * @protected
 */
/**
 * @external {CypherPokerConfig} https://cypherpoker.github.io/cypherpoker-js/#config
 * @protected
 */
import { Game as CypherPokerGame, Player as CypherPokerPlayer,
  Deck as CypherPokerDeck, Config as CypherPokerConfig } from 'cypherpoker';
/**
 * @external {BigNum} https://github.com/indutny/bn.js/
 * @protected
 */
import BigNum from 'bn.js';

import Channel from './Channel';
import Connection from './Connection';
import URL from './URL';
import Game from './Game';
import Deck from './Deck';
import Die from './Die';
import Piece from './Piece';

/**
 * A card face
 * @typedef {Object} CardFace
 */

/**
 * A die face
 * @typedef {Object} DieFace
 */

/**
 * An instance factory for event signals
 * @protected
 * @typedef {Object} SignalFactory
 * @property {function(): Signal} instance - creates a new Signal instance
 */

/**
 * An instance factory for open channels
 * @protected
 * @typedef {Object} ChannelFactory
 * @property {function(dataChannel: DataChannel): Channel} instance - creates a new Channel instance
 */

/**
 * An instance factory for the signaling connection
 * @protected
 * @typedef {Object} ConnectionFactory
 * @property {function(signalingUrl: string): Connection} instance - creates the connection
 */

/**
 * An instance factory for CypherPoker Games
 * @protected
 * @typedef {Object} CypherPokerGameFactory
 * @property {function(players: Array<CypherPokerPlayer>): CypherPokerGame} instance - new C.P.Game
 */

/**
 * An instance factory for CypherPoker Players
 * @protected
 * @typedef {Object} CypherPokerPlayerFactory
 * @property {function(params: ?Object): CypherPokerPlayer} instance - creates CypherPokerPlayer
 */

/**
 * An instance factory for CypherPoker Decks
 * @protected
 * @typedef {Object} CypherPokerDeckFactory
 * @property {function(points: Array): CypherPokerDeck} instance - creates CypherPokerDeck
 */

/**
 * An instance factory for EllipticPoints
 * @protected
 * @typedef {Object} EllipticPointFactory
 * @property {function(x: string, y: string): EllipticPoint} instance - creates EllipticPoint
 */

/**
 * An instance factory for BigNums
 * @protected
 * @typedef {Object} BigNumFactory
 * @property {function(base16number: string): BigNum} instance - creates a new BigNum instance
 */

/**
 * An instance factory for Decks
 * @protected
 * @typedef {Object} DeckFactory
 * @property {function(id: number, cardFaces: CardFace[], game: Game): Deck} instance - creates Deck
 */

/**
 * An instance factory for Dice
 * @protected
 * @typedef {Object} DieFactory
 * @property {function(id: number, dieFaces: DieFace[], game: Game): Die} instance - creates Die
 */

/**
 * An instance factory for Pieces
 * @protected
 * @typedef {Object} PieceFactory
 * @property {function(id: number, game: Game): Piece} instance - creates a new Piece instance
 */

const bottle = new Bottle();
bottle.service('DataChannel', DataChannel);
bottle.instanceFactory('SignalFactory', () => new Signal());
bottle.instanceFactory('ChannelFactory', (container, dataChannel) => (new Channel(dataChannel,
  container.SignalFactory)));
bottle.instanceFactory('ConnectionFactory', (container, signalingUrl) =>
  new Connection(signalingUrl, container.DataChannel, container.ChannelFactory));
bottle.service('URL', URL);
bottle.instanceFactory('CypherPokerGameFactory',
  (container, players) => new CypherPokerGame({ players }));
bottle.instanceFactory('CypherPokerPlayerFactory',
  (container, params) => new CypherPokerPlayer(params));
bottle.instanceFactory('CypherPokerDeckFactory',
  (container, points) => new CypherPokerDeck(points));
bottle.instanceFactory('EllipticPointFactory',
  (container, x, y) => CypherPokerConfig.ec.curve.point(x, y, true));
bottle.instanceFactory('BigNumFactory',
  (container, base16number) => new BigNum(base16number, 16));
bottle.instanceFactory('DeckFactory', (container, id, cardFaces, game) => (new Deck(id, cardFaces,
  game, container.CypherPokerGameFactory, container.CypherPokerPlayerFactory,
  container.CypherPokerDeckFactory, container.EllipticPointFactory, container.BigNumFactory,
  container.SignalFactory)));
bottle.instanceFactory('DieFactory', (container, id, dieFaces, game) => (new Die(id, dieFaces, game,
  container.SignalFactory)));
bottle.instanceFactory('PieceFactory', (container, id, game) => (new Piece(id, game,
  container.SignalFactory)));
bottle.instanceFactory('GameFactory', (container, signalingUrl) => (new Game(signalingUrl,
  container.ConnectionFactory, container.URL, container.DeckFactory, container.DieFactory,
  container.PieceFactory, container.SignalFactory)));

/**
 * The library’s factory
 * @param {string} signalingUrl - The relative or absolute URL of the signaling.php file
 * @return {Game} the library's facade instance
 */
function p2pboardgameapi(signalingUrl) {
  return bottle.container.GameFactory.instance(signalingUrl);
}
export { p2pboardgameapi };
