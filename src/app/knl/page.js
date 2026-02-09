import Link from 'next/link';

export default function KnlPage() {
    return (
        <div style={{ padding: '40px', fontFamily: 'var(--font-outfit), sans-serif', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#45B7D1' }}>KNL Branch</h1>
            <p style={{ marginTop: '20px', fontSize: '1.2rem', color: '#555' }}>
                Welcome to the KNL management page.
            </p>

            <Link href="/yet-to-accept">
                <button style={{
                    marginTop: '30px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    backgroundColor: '#E74C3C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s'
                }}>
                    Yet To Accept
                </button>
            </Link>

            <Link href="/accepted">
                <button style={{
                    marginTop: '30px',
                    marginLeft: '20px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s'
                }}>
                    Accepted
                </button>
            </Link>

            <Link href="/payments">
                <button style={{
                    marginTop: '30px',
                    marginLeft: '20px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    backgroundColor: '#FF6F61',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s'
                }}>
                    Payments
                </button>
            </Link>
        </div>
    );
}
