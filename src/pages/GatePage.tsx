import { useSearchParams } from 'react-router';
import './gate.css';

type Reason = 'invalid' | 'revoked' | 'expired' | 'none';

const MESSAGES: Record<Reason, { title: string; body: string }> = {
  invalid: {
    title: 'This link is not valid',
    body: 'The address you followed does not match any active invitation. Check the link you were sent, or ask your contact at Stable Chaos for a new one.',
  },
  revoked: {
    title: 'This link has been turned off',
    body: 'Access for this invitation was withdrawn. If you believe that is a mistake, contact your Stable Chaos contact for a fresh link.',
  },
  expired: {
    title: 'This link has expired',
    body: 'Invitations are time-limited. Ask your Stable Chaos contact to reissue one and you will be back in immediately.',
  },
  none: {
    title: 'Invitation required',
    body: 'This briefing is private and opens only through a personal invitation link. Please use the link you were sent.',
  },
};

/** Static message shown when the gate rejects (or is missing) a session. */
export function GatePage() {
  const [params] = useSearchParams();
  const raw = params.get('r') ?? 'none';
  const reason: Reason = raw in MESSAGES ? (raw as Reason) : 'none';
  const { title, body } = MESSAGES[reason];

  return (
    <div className="gate">
      <img className="gate-mark sc-logo-glow" src="/assets/logos/logo-white.svg" alt="" />
      <div className="sc-label">Stable Chaos</div>
      <h1 className="gate-title">{title}</h1>
      <p className="gate-body">{body}</p>
    </div>
  );
}
