'use client';

import { useRouter } from 'next/navigation';
import './dashboard.css';

export default function Dashboard() {
    const router = useRouter();

    const branches = [
        { name: 'Snofield', path: '/snofield', color: '#FF6B6B', id: '3' },
        { name: 'Kushas', path: '/kushas', color: '#4ECDC4', id: '1' },
        { name: 'Knl', path: '/knl', color: '#45B7D1', id: '2' },
        { name: 'Bros', path: '/bros', color: '#FFA07A', id: '4' },
        { name: 'Mayuri', path: '/mayuri', color: '#98D8C8', id: '5' },
    ];

    const handleBranchClick = (branch) => {
        localStorage.setItem('restaurantId', branch.id);
        alert(`Selected Branch ID: ${branch.id}`);
        router.push(branch.path);
    };

    return (
        <div className="dashboardContainer">
            <h1 className="dashboardTitle">Select a Branch</h1>
            <div className="buttonGrid">
                {branches.map((branch) => (
                    <button
                        key={branch.name}
                        className="branchButton"
                        style={{ '--btn-color': branch.color }}
                        onClick={() => handleBranchClick(branch)}
                    >
                        {branch.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
