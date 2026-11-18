import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Inbox, Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Avatar, Badge, Breadcrumbs, Button, Callout, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, Drawer, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, EmptyState,
  ErrorState, FormField, Input, PageHeader, PageSkeleton, Progress, ProgressRing, Segmented, Select, StatCard, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast,
} from './ui';
import { ErrorScreen } from './ErrorScreen';
import { axisProps, ChartCard, ChartTooltip, chartColor, gridProps, useChartMotion } from './charts';

/** Development reference for the design system. Not part of the product: only mounted when running `npm run dev`. */
const swatches = ['primary', 'navy', 'success', 'warning', 'danger'] as const;
const trend = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((m, i) => ({ m, v: [91, 93, 92, 95, 94, 96][i], last: [88, 90, 89, 92, 93, 93][i] }));
type Row = { id: string; name: string; cls: string; fee: number; status: 'Paid' | 'Due' | 'Overdue' };
const rows: Row[] = [
  { id: '1', name: 'Sample student A', cls: 'Class 8-A', fee: 4200, status: 'Paid' }, { id: '2', name: 'Sample student B', cls: 'Class 8-B', fee: 5800, status: 'Due' },
  { id: '3', name: 'Sample student C', cls: 'Class 9-A', fee: 6100, status: 'Overdue' }, { id: '4', name: 'Sample student D', cls: 'Class 6-C', fee: 3900, status: 'Paid' },
];
const cols: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Student', cell: (c) => <span className="flex items-center gap-2"><Avatar name={c.row.original.name} size={24} />{c.row.original.name}</span> },
  { accessorKey: 'cls', header: 'Class', meta: { hideBelow: 'sm' } },
  { accessorKey: 'fee', header: 'Fee', meta: { align: 'right' }, cell: (c) => `₹${c.row.original.fee.toLocaleString('en-IN')}` },
  { accessorKey: 'status', header: 'Status', cell: (c) => <Badge dot tone={({ Paid: 'success', Due: 'warning', Overdue: 'danger' } as const)[c.row.original.status]}>{c.row.original.status}</Badge> },
];

export default function Gallery() {
  const toast = useToast();
  const [open, setOpen] = useState(false); const [drawer, setDrawer] = useState(false); const [view, setView] = useState<'a' | 'b'>('a');
  const motion = useChartMotion();
  return (
    <div data-portal="admin" className="mx-auto max-w-6xl space-y-10 px-5 py-10">
      <PageHeader title="Design system" description="Development reference. Every figure on this page is a labelled sample, not school data." eyebrow={<Breadcrumbs items={[{ label: 'Design', to: '/design' }, { label: 'Components' }]} />}
        actions={<><Button onClick={() => toast('Saved')}>Show toast</Button><Button variant="primary" onClick={() => setOpen(true)}><Plus />New item</Button></>} />

      <section className="space-y-3"><h2 className="text-lg font-semibold">Colour</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{swatches.map((s) => <div key={s} className="overflow-hidden rounded-lg border border-border"><div className={`h-14 bg-${s}`} /><div className="px-3 py-2 text-xs capitalize">{s}</div></div>)}</div>
        <p className="text-sm text-muted-foreground">Text secondary on background, tabular figures: <span className="tabular-nums text-foreground">₹1,24,860.50</span></p></section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Buttons and badges</h2>
        <div className="flex flex-wrap items-center gap-2"><Button variant="primary">Primary</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="soft">Soft</Button><Button variant="danger"><Trash2 />Delete</Button><Button variant="primary" loading>Saving</Button><Button disabled>Disabled</Button></div>
        <div className="flex flex-wrap gap-2"><Badge>Neutral</Badge><Badge tone="primary" dot>Current</Badge><Badge tone="success" dot>Present</Badge><Badge tone="warning" dot>Due</Badge><Badge tone="danger" dot>Overdue</Badge></div></section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Forms</h2>
        <Card><CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" required hint="As on the admission form"><Input placeholder="Student name" /></FormField>
          <FormField label="Class"><Select defaultValue=""><option value="" disabled>Choose class</option><option>Class 8</option></Select></FormField>
          <FormField label="Phone" error="Enter a 10 digit number"><Input defaultValue="98" /></FormField>
          <FormField label="Remarks"><Textarea placeholder="Optional" /></FormField>
        </CardContent></Card></section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Stat cards</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Attendance today" value="94.2%" delta={{ value: '1.4 pts', tone: 'good', vs: 'vs last week' }} to="/design" />
          <StatCard label="Outstanding dues" value="₹3,42,000" delta={{ value: '₹18,000', tone: 'bad', vs: 'vs last month' }} to="/design" />
          <StatCard label="Admissions" value="38" delta={{ value: 'No change', vs: 'vs last month' }} />
          <StatCard label="Loading" value="" loading />
        </div></section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3"><h2 className="sr-only">Charts</h2>
        <ChartCard className="lg:col-span-2" title="Attendance trend" description="Sample data, monthly average" to="/design" height={260}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ left: -16, right: 8, top: 4 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="m" {...axisProps} /><YAxis domain={[80, 100]} {...axisProps} unit="%" />
            <RTooltip content={<ChartTooltip format={(v) => `${v}%`} />} cursor={{ stroke: chartColor.neutral }} />
            <Area type="monotone" dataKey="last" name="Last year" stroke={chartColor.neutral} strokeWidth={1.5} fill="none" {...motion} />
            <Area type="monotone" dataKey="v" name="This year" stroke={chartColor.primary} strokeWidth={2} fill={chartColor.primary} fillOpacity={0.08} {...motion} />
          </AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Collection by class" description="Sample data, in thousands" height={260}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={[{ c: '6', v: 12 }, { c: '7', v: 15 }, { c: '8', v: 21 }, { c: '9', v: 18 }]} margin={{ left: -16 }}>
            <CartesianGrid {...gridProps} /><XAxis dataKey="c" {...axisProps} /><YAxis {...axisProps} />
            <RTooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--c-muted))' }} />
            <Bar dataKey="v" name="Collected" fill={chartColor.neutral} radius={[4, 4, 0, 0]} {...motion} />
          </BarChart></ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Table</h2>
        <DataTable columns={cols} data={rows} caption="Sample fee table" searchPlaceholder="Search students" toolbar={<Segmented label="View" value={view} onChange={setView} options={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Overdue' }]} />} onRowClick={() => setDrawer(true)} /></section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Tabs, progress, states</h2>
        <Tabs defaultValue="one"><TabsList><TabsTrigger value="one">Overview</TabsTrigger><TabsTrigger value="two">Attendance</TabsTrigger></TabsList>
          <TabsContent value="one"><div className="flex items-center gap-8"><ProgressRing value={94} caption="Present" tone="success" /><div className="w-64"><Progress value={72} label="Homework done" /></div></div></TabsContent>
          <TabsContent value="two"><Callout tone="info">Attendance is recorded by the class teacher.</Callout></TabsContent></Tabs>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card><EmptyState icon={Inbox} title="No homework today" description="New homework appears here once a teacher posts it." action={<Button size="sm">Browse materials</Button>} /></Card>
          <Card><ErrorState error={new Error('The server did not respond')} onRetry={() => undefined} /></Card>
          <Card><CardHeader><CardTitle>Loading</CardTitle><CardDescription>Skeleton</CardDescription></CardHeader><CardContent><PageSkeleton /></CardContent></Card>
        </div></section>

      <section className="space-y-3"><h2 className="text-lg font-semibold">Error pages</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card><ErrorScreen kind="crash" inline error={new Error('Sample crash')} onRetry={() => undefined} /></Card>
          <Card><ErrorScreen kind="notfound" inline /></Card>
          <Card><ErrorScreen kind="offline" inline onRetry={() => undefined} /></Card>
          <Card><ErrorScreen kind="update" inline /></Card>
        </div></section>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New item</DialogTitle></DialogHeader><DialogBody><FormField label="Title"><Input autoFocus /></FormField></DialogBody><DialogFooter><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { setOpen(false); toast('Created'); }}>Create</Button></DialogFooter></DialogContent></Dialog>
      <Drawer open={drawer} onOpenChange={setDrawer} title="Sample student A" description="Detail drawer" footer={<Button onClick={() => setDrawer(false)}>Close</Button>}><p className="text-sm text-muted-foreground">Drawers hold quick edits and detail without leaving the list.</p></Drawer>
    </div>
  );
}
