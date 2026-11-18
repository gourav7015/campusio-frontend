import { CredentialsModal } from './ui.jsx';

/** Shows a login id and temporary password once, with a Copy button. */
export default function CredentialsCard({ creds, title, onClose }) {
  return <CredentialsModal creds={creds} title={title} onClose={onClose} />;
}
