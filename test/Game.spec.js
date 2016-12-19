import Game from '../src/Game';
import URL from '../src/URL';
import ConnectionNotStartedError from '../src/ConnectionNotStartedError';

/** @test {Game} */
describe('Game', function () {
  let game;
  let connection;
  let url;
  let deck;
  beforeEach(function () {
    connection = {
      open: sinon.stub().returns({
        getID() {
          return 'id';
        },
      }),
      connect: sinon.stub(),
    };
    const connectionFactory = {
      instance: () => connection,
    };
    url = new URL();
    sinon.stub(url, 'setHash');
    sinon.stub(url, 'hasHash').returns(false);
    sinon.stub(url, 'getHash').returns('hash');
    sinon.stub(url, 'getURL').returns('full URL');
    const signalFactory = {
      instance: () => ({
        add: () => {},
      }),
    };
    deck = {
      mock: 'Deck',
      shuffle: () => {},
    };
    const deckFactory = {
      instance: () => deck,
    };
    game = new Game('', connectionFactory, url, deckFactory, {}, {}, signalFactory);
    sinon.stub(game, 'registerEvents');
  });

  describe('#startConnection()', function () {
    /** @test {Game#startConnection()} */
    it('opens a new connection if no URL hash is set', function () {
      game.startConnection();
      expect(connection.open).to.have.been.called();
    });

    /** @test {Game#startConnection()} */
    it('sets the URL hash when new connection is opened', function () {
      game.startConnection();
      expect(url.setHash).to.have.been.calledWith('id');
    });

    /** @test {Game#startConnection()} */
    it('sets the player number to 0 if new connection is opened', function () {
      game.startConnection();
      expect(game.playerNumber).to.equal(0);
    });

    /** @test {Game#startConnection()} */
    it('connects if a URL hash is set', function () {
      url.hasHash.returns(true);
      game.startConnection();
      expect(connection.connect).to.have.been.calledWith('hash');
    });

    /** @test {Game#startConnection()} */
    it('doesn’t set the player number to 0 if connected to other host', function () {
      url.hasHash.returns(true);
      game.startConnection();
      expect(game.playerNumber).to.not.equal(0);
    });
  });

  describe('#getURL()', function () {
    /** @test {Game#getURL} */
    it('throws ConnectionNotStartedError if not connected', function () {
      expect(game.getURL.bind(game)).to.throw(ConnectionNotStartedError);
    });

    /** @test {Game#getURL} */
    it('returns the current URL if connected', function () {
      game.startConnection();
      expect(game.getURL()).to.equal('full URL');
    });
  });

  describe('#getNumberOfPlayers()', function () {
    /** @test {Game#getNumberOfPlayers} */
    it('rejects with ConnectionNotStartedError if not connected', function () {
      expect(game.getNumberOfPlayers()).to.be.rejectedWith(ConnectionNotStartedError);
    });

    /** @test {Game#getNumberOfPlayers} */
    it('returns the number of players if connected', function () {
      game.startConnection();
      game.channel.getNumberOfUsers = sinon.stub().returns(Promise.resolve(3));
      expect(game.getNumberOfPlayers()).to.become(3);
    });
  });

  describe('#registerEvents()', function () {
    /** @test {Game#registerEvents} */
    it('registers the needed events', function () {
      game.registerEvents.restore();
      game.channel = {
        on: {
          userJoin: {
            add: sinon.spy(),
          },
          userLeave: {
            add: sinon.spy(),
          },
          message: {
            add: sinon.spy(),
          },
        },
      };
      game.registerEvents();
      expect(game.channel.on.userJoin.add).to.have.been.called();
      expect(game.channel.on.userLeave.add).to.have.been.called();
      expect(game.channel.on.message.add).to.have.been.called();
    });
  });

  describe('#start()', function () {
    beforeEach(function () {
      game.on.start.dispatch = sinon.spy();
    });

    /** @test {Game#start} */
    it('throws ConnectionNotStartedError if not connected', function () {
      expect(game.start.bind(game)).to.throw(ConnectionNotStartedError);
    });

    /** @test {Game#start} */
    it('fires start event', function () {
      game.startConnection();
      game.channel.getUserID = sinon.stub();
      game.channel.getOtherUserIDs = sinon.stub().returns(Promise.reject());
      game.channel.send = sinon.spy();
      game.start();
      expect(game.on.start.dispatch).to.have.been.called();
    });

    /** @test {Game#start} */
    it('sends start message and player numbers to other players', function (done) {
      game.startConnection();
      game.channel.send = sinon.spy();
      game.channel.getUserID = sinon.stub().returns('first');
      game.channel.getOtherUserIDs = sinon.stub().returns({
        then: (callback) => {
          callback(['second', 'third']);
          expect(game.channel.send).to.have.been.calledWith({
            type: 'start',
            userIDs: ['first', 'second', 'third'],
          });
          done();
        },
      });
      game.start();
    });
  });

  describe('#handleMessage()', function () {
    let startMessage;
    beforeEach(function () {
      game.startConnection();
      game.channel.getUserID = sinon.stub().returns('second');
      game.on.start.dispatch = sinon.spy();
      startMessage = {
        type: 'start',
        userIDs: ['first', 'second', 'third'],
      };
    });

    /** @test {Game#handleMessage} */
    it('should set user IDs on start message', function () {
      game.handleMessage(startMessage);
      expect(game.players).to.deep.equal(startMessage.userIDs);
    });

    /** @test {Game#handleMessage} */
    it('should set player number on start message', function () {
      game.handleMessage(startMessage);
      expect(game.playerNumber).to.equal(1);
    });

    /** @test {Game#handleMessage} */
    it('should fire start event on start message', function () {
      game.handleMessage(startMessage);
      expect(game.on.start.dispatch).to.have.been.called();
    });

    /** @test {Game#handleMessage} */
    it('should redirect to the corresponding deck on deck message', function () {
      const deckID = 2;
      const deckMessage = {
        type: 'deck/example',
        deckID,
      };
      const userID = 42;
      game.decks[deckID] = {
        handleMessage: sinon.spy(),
      };
      game.handleMessage(deckMessage, userID);
      expect(game.decks[deckID].handleMessage).to.have.been.calledWith(deckMessage, userID);
    });

    /** @test {Game#handleMessage} */
    it('should redirect to the corresponding die on die message', function () {
      const dieID = 'die';
      const dieMessage = {
        type: 'die/example',
        dieID,
      };
      const die = {
        handleMessage: sinon.spy(),
      };
      const userID = 42;
      game.dice.set(dieID, die);
      game.handleMessage(dieMessage, userID);
      expect(die.handleMessage).to.have.been.calledWith(dieMessage, userID);
    });

    /** @test {Game#handleMessage} */
    it('should redirect to the corresponding piece on piece message', function () {
      const pieceID = 'piece';
      const pieceMessage = {
        type: 'piece/example',
        pieceID,
      };
      const piece = {
        handleMessage: sinon.spy(),
      };
      const userID = 42;
      game.pieces.set(pieceID, piece);
      game.handleMessage(pieceMessage, userID);
      expect(piece.handleMessage).to.have.been.calledWith(pieceMessage, userID);
    });
  });

  describe('#createDeck()', function () {
    /** @test {Game#createDeck} */
    it('should return a deck with the given cards', function () {
      expect(game.createDeck(['cards'])).to.deep.equal(deck);
    });

    /** @test {Game#createDeck} */
    it('should shuffle deck on game start or if already started', function () {
      sinon.stub(game.on.start, 'add');
      game.createDeck();
      expect(game.on.start.memorize).to.be.true();
      expect(game.on.start.add).to.have.been.calledWith(deck.shuffle, deck);
    });
  });
});
