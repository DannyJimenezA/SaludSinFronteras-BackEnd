// src/common/interceptors/transform.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) =>
        JSON.parse(
          JSON.stringify(data, (_, value) => {
            if (typeof value === 'bigint') return value.toString();
            if (value instanceof Date) return value.toISOString();
            return value;
          }),
        ),
      ),
    );
  }
}
