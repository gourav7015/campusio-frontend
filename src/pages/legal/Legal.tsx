import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PublicPage, Contact } from '../PublicPage';
import { site } from '../../config';

const H = ({ children }: { children: ReactNode }) => <h2 className="mt-10 text-xl font-semibold tracking-tight">{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p className="mt-3 leading-7 text-foreground/90">{children}</p>;
const UL = ({ items }: { items: ReactNode[] }) => <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-7 text-foreground/90">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>;
const Name = () => <>{site.company || site.name}</>;
const link = 'font-medium text-primary-ink hover:underline';

/** "Questions? Email x or call y", built only from the details that have been set. */
function Reach() {
  if (!site.email && !site.phone) return <>Please contact your school’s administrator.</>;
  return <>Write to <Contact kind="email" />{site.email && site.phone ? ' or call ' : ''}<Contact kind="phone" />.</>;
}

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PublicPage title={title} index>
      <article className="mx-auto max-w-3xl pt-8">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.025em]">{title}</h1>
        {children}
      </article>
    </PublicPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <H>1. Who is responsible for the data</H>
      <P>{site.name} provides school-management software to schools{site.company ? <> and is operated by {site.company}{site.address ? <>, {site.address}</> : null}</> : null}. Each school decides why and how the personal data of its students, parents or guardians, teachers and staff is used. Under the Digital Personal Data Protection Act, 2023, <strong>the school is the Data Fiduciary</strong>; {site.name} processes the data on the school’s behalf and on its instructions.</P>

      <H>2. What is collected, and why</H>
      <UL items={[
        <><strong>Students:</strong> name, date of birth, gender, admission number, class and section, guardian names, relationships and phone numbers, address, photograph, uploaded documents, attendance, marks and results, homework and materials viewed, fees and payments, library loans, school-bus allocation, and remarks teachers record. Purpose: running the school’s academic, administrative and fee operations.</>,
        <><strong>Teachers and non-teaching staff:</strong> name, employee number, phone, email, qualifications, subjects, attendance and leave, check-in and check-out times (and the device location at the moment of check-in, only if the school switches the location check on), salary details, and bank account, PAN, UAN and ESI numbers used to prepare payroll and statutory files. Purpose: employment administration and payroll.</>,
        <><strong>Everyone who signs in:</strong> login id, a securely hashed password (never the password itself), role, the school, when they last signed in, and for each session the device description and network address, kept for account security and so users can see and end their own sessions.</>,
        <><strong>Audit trail:</strong> a record of who changed what and when, kept for accountability and to resolve disputes.</>,
      ]} />
      <P>Only data the school enters or the person provides is held. There is no advertising, no sale of data, no profiling for marketing and no behavioural tracking of children.</P>

      <H>3. Children’s data</H>
      <P>Most data in this system belongs to children. The school is responsible for obtaining the verifiable consent of a parent or lawful guardian where the law requires it, and for the other duties the Act places on handling children’s data. {site.name} does not show advertising to children, does not track or monitor their behaviour, and limits each student to their own records.</P>

      <H>4. Who can see it</H>
      <P>Access is limited by role and by school. A school’s data is separated from every other school’s. Students see their own records, teachers see their own classes, and finance, library and transport staff see only their own area. School administrators see their whole school. {site.name} staff may enter a school’s records only to set it up or fix a problem, and each such action is recorded in the school’s audit log.</P>

      <H>5. Service providers</H>
      <UL items={['Database hosting: MongoDB Atlas.', 'No payment gateway, analytics, advertising or social-media service is built into the application, and fonts are served from the application itself.', 'The application does not send text messages or email.']} />

      <H>6. How long data is kept</H>
      <P>The school decides how long its records are kept. When a student leaves, the record is marked withdrawn or completed and stays available to the school’s administrator. A school can ask for its data to be exported, or deleted, when it ends its agreement.</P>

      <H>7. Security</H>
      <P>Passwords are stored hashed. Sessions can be ended by the user and by administrators. Access is checked on the server for every request, and every school’s records are isolated from the others. Uploaded files are checked and served only through short-lived links. No system is free of risk; if a personal data breach occurs, the affected school is told without undue delay so that it can meet its own duties.</P>

      <H>8. Your rights</H>
      <P>People whose data is held can ask to know what is held, to have it corrected or completed, to have it erased where the law allows, to have a grievance resolved, and to nominate someone to act for them. Parents and guardians exercise these rights for their children. Please make requests to your school first: the school’s administrator can correct records and can ask {site.name} for help with an export or an erasure.</P>

      <H>9. Questions and complaints</H>
      <P>{site.grievanceOfficer ? <>Grievance officer: {site.grievanceOfficer}. </> : null}For a request about personal data, or a complaint, write to <Contact kind="privacy" />. If a concern is not resolved you may approach the Data Protection Board of India once it is operational for complaints.</P>

      <H>10. Changes</H>
      <P>When this policy changes, the new version will be published here. See also <Link className={link} to="/cookies">cookies and browser storage</Link>.</P>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms and conditions">
      <H>1. The service</H>
      <P>{site.name} is school-management software provided by <Name /> to schools. These terms apply to the school that subscribes and to everyone the school lets use it: administrators, teachers, staff, students and families.</P>
      <H>2. Accounts</H>
      <P>There is no public sign-up. Accounts for school administrators are created by {site.name}, and accounts for everyone else by the school. Keep your login id and password private, use only your own account, and tell your school at once if you think someone else has used it. The school decides who gets an account and what role they have.</P>
      <H>3. What the school is responsible for</H>
      <UL items={['Entering accurate information and keeping it up to date.', 'Having the lawful basis and the consents needed to put personal data, especially children’s data, into the system.', 'Giving accounts only to the right people and removing access when someone leaves.', 'Its own decisions about fees, attendance, marks, payroll and staffing. The software records and calculates; it does not replace the school’s judgement or its legal duties, including statutory deductions, which the school’s accountant must check.']} />
      <H>4. Acceptable use</H>
      <P>Do not try to reach another school’s data or another person’s account, interfere with the service or its security, upload malicious or unlawful files, or use the service for anything other than school administration.</P>
      <H>5. Subscription, availability and support</H>
      <P>A school’s plan, price, renewal and support terms are set out in its agreement with <Name />. A plan sets limits such as the number of students and teachers. A school whose subscription ends or is suspended cannot sign in until it is restored.</P>
      <H>6. Data and leaving</H>
      <P>School data belongs to the school. When the agreement ends, the school can ask for its data to be exported and then deleted.</P>
      <H>7. Liability, changes and governing law</H>
      <P>Liability, termination and changes to the service are dealt with in the school’s agreement. These terms are governed by the laws of India.</P>
      <H>8. Contact</H>
      <P><Reach /></P>
    </LegalPage>
  );
}

const STORAGE: { name: string; where: string; purpose: string; kind: string; lasts: string }[] = [
  { name: 'erp.token', where: 'Session storage', purpose: 'Keeps you signed in while this tab is open', kind: 'Strictly necessary', lasts: 'Until the tab is closed or you sign out' },
  { name: 'erp.acting', where: 'Session storage', purpose: 'Remembers which school a platform administrator is working in', kind: 'Strictly necessary', lasts: 'Until the tab is closed' },
  { name: 'erp.theme', where: 'Local storage', purpose: 'Remembers light or dark appearance', kind: 'Preference you chose', lasts: 'Until you clear it or choose “match device”' },
  { name: 'erp.nav.collapsed', where: 'Local storage', purpose: 'Remembers whether you folded the side menu', kind: 'Preference you chose', lasts: 'Until cleared' },
  { name: 'erp.student.wallpaper', where: 'Local storage', purpose: 'Remembers the wallpaper a student picked for their home page', kind: 'Preference you chose', lasts: 'Until cleared' },
];

export function Cookies() {
  return (
    <LegalPage title="Cookies and browser storage">
      <H>What {site.name} stores in your browser</H>
      <P>{site.name} does <strong>not set cookies</strong>, and it does not load analytics, advertising or social-media scripts or fonts from other websites. It keeps a few small items in your browser so it can work:</P>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Items stored in the browser</caption>
          <thead><tr className="bg-muted/60 text-xs text-muted-foreground">{['Item', 'Where', 'What it is for', 'Type', 'How long'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>{STORAGE.map((r) => <tr key={r.name} className="border-t border-border/70 align-top"><td className="px-4 py-2.5 font-medium">{r.name}</td><td className="px-4 py-2.5">{r.where}</td><td className="px-4 py-2.5">{r.purpose}</td><td className="px-4 py-2.5">{r.kind}</td><td className="px-4 py-2.5">{r.lasts}</td></tr>)}</tbody>
        </table>
      </div>
      <H>Consent</H>
      <P>These items are needed to provide the service you asked for or to remember a choice you made. None is used to track you across websites or for advertising, so no cookie banner is shown. If tracking or analytics is ever added, this page will change and your permission will be asked first.</P>
      <H>Controlling it</H>
      <P>You can clear this storage at any time in your browser’s settings. Signing out removes the sign-in items. See the <Link className={link} to="/privacy">privacy policy</Link> for how personal data is handled.</P>
    </LegalPage>
  );
}

export function Refunds() {
  return (
    <LegalPage title="Refund and cancellation policy">
      <P>{site.name} does not take online payments. School fees are recorded by the school’s finance desk (cash, cheque, UPI or bank transfer received by the school), and any refund of school fees is governed by that school’s own policy, not by this page.</P>
      <H>Subscription to {site.name}</H>
      <P>Cancellation, refunds and renewal of a school’s subscription are set out in the agreement between the school and <Name />. For billing questions write to <Contact kind="billing" />.</P>
    </LegalPage>
  );
}
