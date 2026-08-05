import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    const cleanedPhone = (phone || '').replace(/\D/g, '');

    if (!cleanedPhone || cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    const authKey = process.env.MSG91_AUTH_KEY || '556598A3vJm4dIfd6a70d96bP1';
    const templateId = process.env.MSG91_OTP_TEMPLATE_ID || '6a71a5c670c9cbb6400c2f32';
    const mobileNumber = `91${cleanedPhone}`;

    // Call MSG91 Send OTP API
    const response = await fetch(
      `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${mobileNumber}`,
      {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('[MSG91 Send Response]:', data);

    if (data.type === 'success' || response.ok) {
      return NextResponse.json({ success: true, message: 'OTP sent via SMS' });
    }

    return NextResponse.json(
      { error: data.message || 'Failed to send OTP via MSG91' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[MSG91 OTP Send Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Server error while sending OTP' },
      { status: 500 }
    );
  }
}
