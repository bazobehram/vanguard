import Conf from 'conf';

const schema = {
  AI_PROVIDER: {
    type: 'string',
    default: 'gemini',
    enum: ['gemini', 'ollama'],
  },
  GEMINI_KEY: {
    type: 'string',
    default: '',
  },
  OLLAMA_MODEL: {
    type: 'string',
    default: 'qwen2.5:7b',
  },
  OLLAMA_URL: {
    type: 'string',
    default: 'http://localhost:11434',
  },
};

const config = new Conf({ projectName: 'vanguard', schema });

export default config;
