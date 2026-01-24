import nock from 'nock';

// Disable all external network requests during tests to ensure isolation
nock.disableNetConnect();
// Allow localhost for Ollama tests
nock.enableNetConnect('localhost');
