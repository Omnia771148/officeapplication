import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

export async function POST(request) {
  try {
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { success: false, message: 'Title and body are required' },
        { status: 400 }
      );
    }

    const projectId = process.env.CUSTOMER_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.CUSTOMER_FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.CUSTOMER_FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
      return NextResponse.json(
        { success: false, message: 'FCM configurations are missing in backend environment' },
        { status: 500 }
      );
    }

    // Clean private key format
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n').replace(/"/g, '');

    const appName = 'customerApp';
    let customerApp;

    if (admin.apps.length > 0) {
      customerApp = admin.apps.find((app) => app && app.name === appName);
    }

    if (!customerApp) {
      customerApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        appName
      );
    }

    // Send payload to the broadcast topic 'all_customers'
    const message = {
      notification: {
        title: title,
        body: body,
      },
      topic: 'all_customers',
    };

    const response = await customerApp.messaging().send(message);
    console.log('[FCM Admin] Notification sent successfully:', response);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully to all customers!',
      messageId: response,
    });
  } catch (error) {
    console.error('[FCM Admin] Send error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send notification: ' + error.message },
      { status: 500 }
    );
  }
}
