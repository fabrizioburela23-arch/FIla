import pino from 'pino';

const isDevelopment =
  (process.env.NODE_ENV ?? 'development') === 'development';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  isDevelopment
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname,env',
          messageFormat: '{msg}',
          singleLine: false,
        },
      })
    : undefined
);

export default logger;
