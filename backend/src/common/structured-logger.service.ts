import { Injectable, LoggerService } from '@nestjs/common';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class StructuredLogger implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  private formatLog(level: LogEntry['level'], message: string, metadata?: Record<string, any>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata,
    };
    return JSON.stringify(entry);
  }

  log(message: string, metadata?: Record<string, any>) {
    console.log(this.formatLog('info', message, metadata));
  }

  error(message: string, trace?: string, metadata?: Record<string, any>) {
    console.error(this.formatLog('error', message, { ...metadata, trace }));
  }

  warn(message: string, metadata?: Record<string, any>) {
    console.warn(this.formatLog('warn', message, metadata));
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('debug', message, metadata));
    }
  }
}
