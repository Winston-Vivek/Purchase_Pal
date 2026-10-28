import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { IS_PUBLIC } from './auth.constants';

/** Opens a route to anonymous callers. Everything else needs a valid cookie. */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC, true);
