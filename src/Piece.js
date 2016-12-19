/**
 * A movable game piece
 */
export default class Piece {
  /**
   * Instantiates a new Piece object
   * @protected
   * @param {string} id - The piece’s ID (has to be unique per game)
   * @param {Game} game - The game where this Piece belongs to
   * @param {SignalFactory} signalFactory - Instance factory for event signals
   */
  constructor(id, game, signalFactory) {
    /**
     * The piece’s ID
     * (unique per game)
     * @protected
     * @type {string}
     */
    this.id = id;
    /**
     * The Game where this Piece belongs to
     * @private
     * @type {Game}
     */
    this.game = game;
    /**
     * Event container
     * @type {Object<string, Signal>}
     * @property {Signal} move - Event signal when the piece is moved by a client to new coordinates (Parameters: x, y)
     */
    this.on = {
      move: signalFactory.instance(),
    };
  }

  /**
   * Rolls the die to generate a number between 1 and 6
   * @emits {move} the piece has been moved
   */
  move(x, y) {
    this.game.channel.send({
      type: 'piece/moved',
      pieceID: this.id,
      x,
      y,
    });
    this.on.move.dispatch(x, y);
  }

  /**
   * Handles a moved message from another player
   * @protected
   * @param {Object} message - The message
   * @emits {move} the piece has been moved
   */
  handleMessage(message) {
    this.on.move.dispatch(message.x, message.y);
  }
}
