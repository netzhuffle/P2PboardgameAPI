import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon/pkg/sinon';
import sinonChai from 'sinon-chai';

global.sinon = sinon;
global.expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

// require all `test/**/*.spec.js`
const testsContext = require.context('.', true, /\.spec\.js$/);

testsContext.keys().forEach(testsContext);
