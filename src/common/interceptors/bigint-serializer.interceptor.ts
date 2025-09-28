// src/common/interceptors/bigint-serializer.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertBigIntDeep(input: any): any {
  if (typeof input === 'bigint') return input.toString();
  if (Array.isArray(input)) return input.map(convertBigIntDeep);
  if (input && typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = convertBigIntDeep(v);
    }
    return out;
  }
  return input;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertBigIntDeep(data)));
  }
}
