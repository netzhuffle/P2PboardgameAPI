import Piece from '../src/Piece';

/** @test {Piece} */
describe('Piece', function () {
  const pieceID = 'piece';
  let piece;
  let game;
  beforeEach(function () {
    game = {
      channel: {
        send: sinon.spy(),
      },
    };
    const signalFactory = {
      instance: () => ({
        dispatch: sinon.spy(),
      }),
    };
    piece = new Piece(pieceID, game, signalFactory);
  });

  describe('#move()', function () {
    /** @test {Piece#move} */
    it('sends message and emits move event', function () {
      const x = 20;
      const y = 30;
      piece.move(x, y);
      expect(game.channel.send).to.have.been.calledWith({
        type: 'piece/moved',
        pieceID,
        x,
        y,
      });
      expect(piece.on.move.dispatch).to.have.been.calledWith(x, y);
    });
  });

  describe('#handleMessage()', function () {
    /** @test {Piece#handleMessage} */
    it('emits move event', function () {
      const x = 12;
      const y = 100;
      const message = {
        type: 'piece/moved',
        pieceID,
        x,
        y,
      };
      piece.handleMessage(message);
      expect(piece.on.move.dispatch).to.have.been.calledWith(x, y);
    });
  });
});
