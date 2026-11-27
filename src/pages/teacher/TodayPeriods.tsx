import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle } from '../../design/ui';
import { YourPeriods } from '../../components/PeriodAttendance.jsx';

/** In a school that takes attendance period by period every teacher marks their own lessons from the home page. */
export function TodayPeriods({ date }: { date: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your periods today</CardTitle>
        <Button size="sm" asChild><Link to="/teacher/period-attendance"><ClipboardCheck aria-hidden />All my periods</Link></Button>
      </CardHeader>
      <YourPeriods date={date} empty="You have no periods today" />
    </Card>
  );
}
