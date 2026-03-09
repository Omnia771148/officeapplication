'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ViewDeliveryBoys() {
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/getdeliveryboys');
                setDeliveryBoys(response.data);
            } catch (err) {
                setError('Failed to fetch data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAccept = async (id) => {
        if (!confirm('Are you sure you want to accept this delivery boy?')) return;

        try {
            await axios.post('/api/acceptdeliveryboy', { id });
            setDeliveryBoys(deliveryBoys.filter(boy => boy._id !== id));
            alert('Delivery boy accepted successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to accept delivery boy.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Registered Delivery Boys
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveryBoys.map((boy) => (
                    <div key={boy._id} className="bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-700 hover:border-blue-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-blue-300">{boy.name}</h2>
                                <p className="text-gray-400 text-sm">{boy.email}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${boy.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                {boy.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-300">
                            <p><span className="font-medium text-gray-500">User ID:</span> {boy._id}</p>
                            <p><span className="font-medium text-gray-500">Firebase UID:</span> {boy.firebaseUid}</p>
                            <p><span className="font-medium text-gray-500">Password:</span> {boy.password}</p>
                            <p><span className="font-medium text-gray-500">Phone:</span> {boy.phone}</p>
                            <p><span className="font-medium text-gray-500">Account:</span> {boy.accountNumber}</p>
                            <p><span className="font-medium text-gray-500">IFSC:</span> {boy.ifscCode}</p>
                            <p><span className="font-medium text-gray-500">Aadhar No:</span> {boy.aadharNumber}</p>
                            <p><span className="font-medium text-gray-500">RC No:</span> {boy.rcNumber}</p>
                            <p><span className="font-medium text-gray-500">License No:</span> {boy.licenseNumber}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-2">
                            {boy.aadharUrl && (
                                <a href={boy.aadharUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 text-center bg-gray-900 py-1 rounded">
                                    Aadhar
                                </a>
                            )}
                            {boy.rcUrl && (
                                <a href={boy.rcUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 text-center bg-gray-900 py-1 rounded">
                                    RC
                                </a>
                            )}
                            {boy.licenseUrl && (
                                <a href={boy.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 text-center bg-gray-900 py-1 rounded">
                                    License
                                </a>
                            )}
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={() => handleAccept(boy._id)}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
