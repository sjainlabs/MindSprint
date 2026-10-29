import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { RewardsService } from './rewards.service';

/** Every successful submit can earn stars, so the rewards summary refreshes after it. */
export const rewardsRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const rewards = inject(RewardsService);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok) rewards.noticeRequest(req.method, req.urlWithParams);
    }),
  );
};
