import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

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
    const existingApps = getApps();
    let customerApp = existingApps.find((app) => app && app.name === appName);

    if (!customerApp) {
      customerApp = initializeApp(
        {
          credential: cert({
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

    const messaging = getMessaging(customerApp);
    const response = await messaging.send(message);
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
