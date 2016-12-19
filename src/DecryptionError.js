/** Error if something could not be decrypted */
export default class DecryptionError extends Error {
  /**
   * Instantiates the error
   * @param {string} message - The error message
   */
  constructor(message = 'The decryption failed due to invalid data sent from other clients') {
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
    this.name = 'DecryptionError';
  }
}
