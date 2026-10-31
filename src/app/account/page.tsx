import type { Metadata } from 'next';
import { Account } from '@/components/account/account';
export const metadata: Metadata = { title: 'Sua conta · Quebra-cabeça', robots: { index: false, follow: false } };
export default function AccountPage() { return <Account />; }
