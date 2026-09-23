import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_STATUS_CHECK_KEY = 'skipTenantStatusCheck';

/**
 * Exempts a route from TenantStatusGuard's block on a suspended/inactive
 * gym. Reserved for the handful of endpoints an owner needs to reach WHILE
 * paused — seeing their own gym's status, and reversing a self-service
 * pause — so a paused gym isn't also a locked door with no way back.
 */
export const SkipTenantStatusCheck = () => SetMetadata(SKIP_TENANT_STATUS_CHECK_KEY, true);
