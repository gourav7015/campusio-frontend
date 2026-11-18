import { useApi } from '../../hooks/useApi.js';
import { Async, Badge, Card, Empty, PageHeader, fmtDate } from '../../components/ui.jsx';
import FileImage from '../../components/FileImage.jsx';
import { openFile } from '../../api/client.js';

const AUTH = { state: 'State government', central: 'Central government', local: 'Local body', other: 'Other' };
const STATE = { valid: ['green', 'Valid'], expiring: ['amber', 'Expiring soon'], expired: ['red', 'Expired'], no_expiry: ['blue', 'No expiry'] };

/** The school's own page: its story, gallery and the licences it holds. Everyone at the school reads the same thing. */
export function SchoolInfoView({ base, bare }) {
  const q = useApi(`${base}/school-info`);
  return (
    <div className="stack">
      {!bare && <PageHeader title="About the school" subtitle="Information from the school office" />}
      <Async state={q}>{(d) => {
        const p = d.profile;
        const facts = [['Board', p.board], ['Affiliation no.', p.affiliationNo], ['Established', p.established], ['Address', p.address], ['Phone', p.phone], ['Email', p.email], ['Website', p.website]].filter(([, v]) => v);
        return (<>
          <Card><h2 style={{ margin: 0 }}>{d.name}</h2>{p.tagline && <p className="muted" style={{ marginTop: 4 }}>{p.tagline}</p>}
            {p.about && <p style={{ whiteSpace: 'pre-wrap' }}>{p.about}</p>}
            {facts.length > 0 && <dl className="kv">{facts.map(([k, v]) => <><dt key={`k${k}`}>{k}</dt><dd key={`v${k}`}>{v}</dd></>)}</dl>}
            {!p.about && !facts.length && <Empty title="The school has not added its details yet" />}</Card>
          {p.principalMessage && <Card title={`A message from ${p.principalName || 'the principal'}`}><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.principalMessage}</p></Card>}
          {p.sections.map((s) => <Card key={s._id} title={s.title}><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{s.body}</p></Card>)}
          {p.gallery.length > 0 && <Card title="Gallery"><div className="grid g3">{p.gallery.map((g) => <figure key={g._id} style={{ margin: 0 }}><FileImage fileId={g.fileId} alt={g.caption || 'School picture'} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 10 }} />{g.caption && <figcaption className="small muted" style={{ marginTop: 4 }}>{g.caption}</figcaption>}</figure>)}</div></Card>}
          {d.licenses.length > 0 && <Card title="Licences and approvals"><ul className="timeline">{d.licenses.map((l) => <li key={l._id}><span className="dotc" /><div className="grow"><b>{l.name}</b><div className="small muted">{AUTH[l.authority]}{l.issuedBy ? ` · ${l.issuedBy}` : ''}{l.number ? ` · No. ${l.number}` : ''}{l.validUntil ? ` · valid until ${fmtDate(l.validUntil, true)}` : ''}</div></div>{l.fileId && <button type="button" className="btn sm" onClick={() => openFile(l.fileId)}>View copy</button>}<Badge tone={STATE[l.state][0]}>{STATE[l.state][1]}</Badge></li>)}</ul></Card>}
        </>);
      }}</Async>
    </div>
  );
}
export const SchoolInfoPage = ({ base }) => <SchoolInfoView base={base} />;
