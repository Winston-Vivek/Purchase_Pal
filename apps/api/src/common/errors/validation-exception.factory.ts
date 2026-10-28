import { BadRequestException, ValidationError } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Turns class-validator's nested errors into a flat `field -> message` map, so
 * a form can put each message next to its input without walking a tree.
 */
function flatten(errors: ValidationError[], parent = ''): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const constraints = error.constraints ? Object.values(error.constraints) : [];

    // First constraint only: a field shows one message at a time.
    if (constraints.length > 0) fields[path] = constraints[0] as string;

    if (error.children && error.children.length > 0) {
      Object.assign(fields, flatten(error.children, path));
    }
  }

  return fields;
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Invalid input',
    fields: flatten(errors),
  });
}
