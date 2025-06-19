const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  }
};

export default logger;
