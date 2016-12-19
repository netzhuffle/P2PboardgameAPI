import Connection from '../src/Connection';

/** @test {Connection} */
describe('Connection', function () {
  const userId = 1337;
  const factoryInstance = 'instance';
  let connection;
  beforeEach(function () {
    connection = new Connection('', {
      userId,
    }, {
      instance: () => factoryInstance,
    });
  });

  describe('#handleSignalingData()', function () {
    const sender = userId + 1;
    const channelId = 'f00b4r';
    const message = 'P2PboardgameAPI';
    let onMessageHandler;
    beforeEach(function () {
      onMessageHandler = sinon.spy();
      connection.onMessageCallbacks.set(channelId, onMessageHandler);
    });

    /** @test {Connection#handleSignalingData} */
    it('calls the right handler', function () {
      const entity = {
        id: 256,
        message: `{"sender": ${sender}, "channelId": "${channelId}", "message": "${message}"}`,
      };
      connection.handleSignalingData(entity);
      expect(onMessageHandler).to.have.been.called();
    });

    /** @test {Connection#handleSignalingData} */
    it('calls with the message', function () {
      const entity = {
        id: 256,
        message: `{"sender": ${sender}, "channelId": "${channelId}", "message": "${message}"}`,
      };
      connection.handleSignalingData(entity);
      expect(onMessageHandler).to.have.been.calledWith(message);
    });

    /** @test {Connection#handleSignalingData} */
    it('does not call with wrong dataChannel', function () {
      const entity = {
        id: 256,
        message: `{"sender": ${sender}, "channelId": "not${channelId}", "message": "${message}"}`,
      };
      connection.handleSignalingData(entity);
      expect(onMessageHandler).to.have.callCount(0);
    });

    /** @test {Connection#handleSignalingData} */
    it('does not call with message from own user id', function () {
      const entity = {
        id: 256,
        message: `{"sender": ${userId}, "channelId": "not${channelId}", "message": "${message}"}`,
      };
      connection.handleSignalingData(entity);
      expect(onMessageHandler).to.have.callCount(0);
    });


    /** @test {Connection#handleSignalingData} */
    it('calls only once for each message id', function () {
      const entity = {
        id: 256,
        message: `{"sender": ${sender}, "channelId": "${channelId}", "message": "${message}"}`,
      };
      connection.handleSignalingData(entity);
      connection.handleSignalingData(entity);
      expect(onMessageHandler).to.have.been.calledOnce();
    });
  });

  describe('#dataChannel.openSignalingChannel()', function () {
    const channelId = 'b4rf00s';
    beforeEach(function () {
      sinon.stub(connection, 'repeatedlyCheck');
    });

    /** @test {Connection#dataChannel.openSignalingChannel} */
    it('sets the onMessageCallback', function () {
      connection.setupChannel();
      connection.dataChannel.openSignalingChannel({
        channel: channelId,
        onmessage: sinon.spy(),
      });
      expect(connection.onMessageCallbacks.has(channelId)).to.be.true();
    });
    /** @test {Connection#dataChannel.openSignalingChannel} */
    it('returns send and dataChannel', function () {
      connection.setupChannel();
      const returnValue = connection.dataChannel.openSignalingChannel({
        channel: channelId,
        onmessage: sinon.spy(),
      });
      expect(returnValue.send).to.be.ok();
      expect(returnValue.channel).to.equal(channelId);
    });
  });

  describe('#open()', function () {
    /** @test {Connection#open} */
    it('returns a factory instance', function () {
      sinon.stub(connection, 'setupChannel');
      connection.dataChannel.open = sinon.stub();

      const channel = connection.open();
      expect(channel).to.equal(factoryInstance);
    });
  });

  describe('#connect()', function () {
    /** @test {Connection#connect} */
    it('returns a factory instance', function () {
      const channelId = 'f00b4r';
      sinon.stub(connection, 'setupChannel');
      connection.dataChannel.connect = sinon.stub();

      const channel = connection.connect(channelId);
      expect(channel).to.equal(factoryInstance);
    });
  });
});
