'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BranchStats from '@/components/BranchStats';
import '@/components/BranchPage.css';

export default function SnofieldPage() {
    const router = useRouter();

    return (
        <div className="branchPageContainer">
            <div className="branchHeader">
                <button className="branchBackButton" onClick={() => router.back()}>← Back</button>
            </div>

            <h1 className="branchTitle" style={{ color: '#009688' }}>Snofield Branch</h1>
            <p className="branchSubtitle">
                Welcome to the Snofield management page.
            </p>

            <div className="branchButtonContainer">
                <Link href="/yet-to-accept">
                    <button className="branchActionButton yetToAccept">
                        Yet To Accept
                    </button>
                </Link>

                <Link href="/accepted">
                    <button className="branchActionButton accepted">
                        Accepted
                    </button>
                </Link>

                <Link href="/payments">
                    <button className="branchActionButton payments">
                        Payments
                    </button>
                </Link>
            </div>

            <BranchStats restaurantId="3" />
        </div>
    );
}