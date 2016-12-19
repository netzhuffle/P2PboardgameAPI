/**
 * Does the signaling for the DataChannel
 * @protected
 */
export default class Connection {
  /**
   * Instantiates a new Connection object
   * @protected
   * @param {string} signalingUrl - The relative or absolute URL of the signaling.php file
   * @param {DataChannel} dataChannel - The DataChannel to operate on
   * @param {ChannelFactory} channelFactory - Instance factory for the opened channel
   */
  constructor(signalingUrl, dataChannel, channelFactory) {
    /**
     * The DataChannel to operate on
     * @private
     * @type {DataChannel}
     */
    this.dataChannel = dataChannel;
    /**
     * The relative or absolute URL of the signaling.php file
     * @private
     * @type {string}
     */
    this.signalingUrl = signalingUrl;
    /**
     * Instance factory for the opened channel
     * @private
     * @type {ChannelFactory}
     */
    this.channelFactory = channelFactory;
    /**
     * Signaling message callbacks per DataChannel, key = DataChannel id
     * @private
     * @type {Map<string, function>}
     */
    this.onMessageCallbacks = new Map();
    /**
     * List of received message ids
     * @private
     * @type {Set<number>}
     */
    this.messagesReceived = new Set();
  }

  /**
   * Creates a new channel with a random ID
   * @protected
   * @return {Channel} the opened channel
   */
  open() {
    this.setupChannel();
    const randomValueBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomValueBuffer);
    const channelId = randomValueBuffer[0].toString(36);
    this.dataChannel.open(channelId);

    return this.channelFactory.instance(this.dataChannel);
  }

  /**
   * Connects to an open dataChannel
   * @protected
   * @param {string} channelId - the channel id
   * @return {Channel} the opened channel
   */
  connect(channelId) {
    this.setupChannel();
    this.dataChannel.connect(channelId);

    return this.channelFactory.instance(this.dataChannel);
  }

  /**
   * Setups and starts the signaling
   * @private
   */
  setupChannel() {
    this.repeatedlyCheck();
    this.dataChannel.openSignalingChannel = (config) => {
      const channelId = config.channel || this.dataChannel.channel;
      this.onMessageCallbacks.set(channelId, config.onmessage);
      if (config.onopen) {
        setTimeout(config.onopen, 1);
      }
      return {
        send: this.sendMessage.bind(this, channelId),
        channel: channelId,
      };
    };
  }

  /**
   * Repeatedly checks the server for new signaling messages
   * @private
   */
  repeatedlyCheck() {
    this.sendXHR().then(data => {
      if (!data || !data.length || data.every(entity => this.messagesReceived.has(entity.id))) {
        setTimeout(this.repeatedlyCheck.bind(this), 400);
        return;
      }

      data.forEach(this.handleSignalingData.bind(this));
      setTimeout(this.repeatedlyCheck.bind(this), 1);
    });
  }

  /**
   * Handles received signaling objects
   * @private
   * @param {Object} entity - A received signaling object
   */
  handleSignalingData(entity) {
    if (this.messagesReceived.has(entity.id)) {
      return;
    }

    this.messagesReceived.add(entity.id);
    const message = JSON.parse(entity.message);
    if (message.sender !== this.dataChannel.userid
        && this.onMessageCallbacks.has(message.channelId)) {
      this.onMessageCallbacks.get(message.channelId)(message.message);
    }
  }

  /**
   * Sends a signaling message over XHR to the signaling url
   * @private
   * @param {string} channelId - The channel id
   * @param {Object} message - The message object
   */
  sendMessage(channelId, message) {
    this.sendXHR({
      channelId,
      message,
      sender: this.dataChannel.userid,
    });
  }

  /**
   * Sends an XMLHttpRequest to the signaling url
   * @private
   * @param {Object} [data] - Data to send
   * @return {Promise<Object>} The response
   */
  sendXHR(data) {
    return new Promise((resolve) => {
      const request = new XMLHttpRequest();
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status === 200) {
          resolve(JSON.parse(request.responseText));
        }
      };
      request.open('POST', this.signalingUrl);
      const formData = new FormData();
      if (data) {
        formData.append('message', JSON.stringify(data));
      }
      request.send(formData);
    });
  }
}
