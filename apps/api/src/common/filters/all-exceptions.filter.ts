import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorBody, ErrorCode, codeForStatus } from '../errors/error-codes';

/** body-parser marks a malformed JSON body with this on the thrown SyntaxError. */
function isMalformedJson(exception: unknown): boolean {
  return (
    exception instanceof SyntaxError &&
    (exception as SyntaxError & { type?: string }).type === 'entity.parse.failed'
  );
}

/**
 * The single place an error becomes a response (error-use-exception-filters).
 *
 * `@Catch()` with no argument takes everything, including errors that are not
 * HttpExceptions — without that, an unexpected throw would bypass this and
 * return Nest's default shape, which is the case a client is least prepared for.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.describe(exception);

    if (status >= 500) {
      // Logged, never sent. A 500 is where stack traces, file paths and
      // connection strings leak to the client.
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({ error: body });
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null) {
        const shaped = payload as Partial<ErrorBody> & { message?: string | string[] };
        return {
          status,
          body: {
            code: shaped.code ?? codeForStatus(status),
            message: Array.isArray(shaped.message)
              ? shaped.message.join(', ')
              : (shaped.message ?? exception.message),
            ...(shaped.fields ? { fields: shaped.fields } : {}),
          },
        };
      }

      return { status, body: { code: codeForStatus(status), message: String(payload) } };
    }

    if (isMalformedJson(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: { code: ErrorCode.VALIDATION_ERROR, message: 'Request body is not valid JSON' },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: ErrorCode.INTERNAL, message: 'Something went wrong' },
    };
  }
}
