/** Error if no error listener was added to critical event */
export default class NoErrorListenerError extends Error {
  /**
   * Instantiates the error
   * @param {string} message - The error message
   */
  constructor(message = 'An error listener needs to be added first to this object') {
    super(message);
    /**
     * The error message
     * @type {string}
     */
    this.message = message;
    /**
     * The error name
     * @type {string}
     */
    this.name = 'NoErrorListenerError';
  }
}
