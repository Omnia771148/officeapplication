'use client';
import { useState, useEffect } from 'react';
import './deliveryboypayments.css';

export default function DeliveryBoyPendingPayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await fetch('/api/deliveryboypendingpayments');
            const result = await response.json();
            if (result.success) {
                setPayments(result.data);
            } else {
                console.error('Failed to fetch payments:', result.error);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDoneClick = (deliveryBoy) => {
        setSelectedDeliveryBoy(deliveryBoy);
        setIsModalOpen(true);
        setTransactionId('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDeliveryBoy(null);
        setTransactionId('');
    };

    const handleConfirmPayment = async () => {
        if (!selectedDeliveryBoy || !transactionId.trim()) {
            alert('Please enter a Transaction ID');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/deliveryboypendingpayments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deliveryBoyId: selectedDeliveryBoy.deliveryBoyId,
                    transactionId: transactionId,
                    amountPaid: selectedDeliveryBoy.deliveryCharge
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Refresh data
                await fetchPayments();
                handleCloseModal();
                alert('Payment recorded successfully!');
            } else {
                alert('Failed to record payment: ' + result.error);
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Error recording payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="container title">Loading...</div>;
    }

    return (
        <div className="container">
            <h1 className="title">Delivery Person Pending Payments</h1>

            {payments.length === 0 ? (
                <div className="no-data">No pending payments found.</div>
            ) : (
                <div className="grid">
                    {payments.map((payment) => (
                        <div key={payment._id} className="card">
                            <h2>{payment.deliveryBoyName}</h2>
                            <div className="info-row">
                                <span className="label">Delivery Boy ID:</span>
                                <span className="value">{payment.deliveryBoyId}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Phone:</span>
                                <span className="value">{payment.deliveryBoyPhone}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Account Number:</span>
                                <span className="value">{payment.accountNumber}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">IFSC Code:</span>
                                <span className="value">{payment.ifscCode}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Pending Charge:</span>
                                <span className="value amount">₹{payment.deliveryCharge}</span>
                            </div>

                            <button
                                className="done-btn"
                                onClick={() => handleDoneClick(payment)}
                                disabled={payment.deliveryCharge === 0}
                                style={payment.deliveryCharge === 0 ? { backgroundColor: '#ccc', cursor: 'not-allowed' } : {}}
                            >
                                {payment.deliveryCharge === 0 ? 'No Dues' : 'Done Payments'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Payment</h3>
                        <p>Recording payment for: <strong>{selectedDeliveryBoy?.deliveryBoyName}</strong></p>
                        <p>Amount to Clear: <strong>₹{selectedDeliveryBoy?.deliveryCharge}</strong></p>

                        <div className="input-group">
                            <label htmlFor="transactionId">Transaction ID</label>
                            <input
                                type="text"
                                id="transactionId"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="Enter Transaction ID"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={handleCloseModal}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleConfirmPayment}
                                disabled={submitting}
                            >
                                {submitting ? 'Processing...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
