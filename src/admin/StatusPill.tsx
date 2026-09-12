import type { LinkStatus } from './api';

const LABEL: Record<LinkStatus, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
};

export function StatusPill({ status }: { status: LinkStatus }) {
  return (
    <span className="admin-pill" data-status={status}>
      <span className="admin-pill-dot" />
      {LABEL[status]}
    </span>
  );
}
