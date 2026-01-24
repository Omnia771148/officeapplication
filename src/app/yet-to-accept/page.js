import Link from 'next/link';
import OrdersDisplay from '@/components/OrdersDisplay';

export default function YetToAcceptPage() {
    return (
        <div style={{ padding: '20px' }}>
            <h1>Yet To Accept Orders</h1>
            <OrdersDisplay />

            <div style={{ marginTop: '20px' }}>
                <Link href="/dashboard">
                    <button>Back to Dashboard</button>
                </Link>
            </div>
        </div>
    );
}
