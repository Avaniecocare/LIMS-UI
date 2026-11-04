import { useSession } from '@/app/providers';
import { PageHeader } from '@/components/ui/primitives';

export default function HomePage() {
  const { user } = useSession();
  return <PageHeader title={`Welcome, ${user?.name}`} description={user?.roles.join(', ')} />;
}
