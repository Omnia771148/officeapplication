import Link from 'next/link';
import OrdersDisplay from '@/components/OrdersDisplay';

export default function LivePage() {
    return (
        <div style={{ padding: '20px' }}>
            <h1>Live Orders</h1>


            <div style={{ marginTop: '20px' }}>
                <Link href="/dashboard">
                    <button>Back to Dashboard</button>
                </Link>
            </div>
        </div>
    );
}
