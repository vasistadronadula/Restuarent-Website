import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();
    const cleanedPhone = (phone || '').replace(/\D/g, '');
    const cleanedOtp = (otp || '').trim();

    if (!cleanedPhone || cleanedPhone.length !== 10 || !cleanedOtp) {
      return NextResponse.json(
        { error: 'Invalid phone number or 6-digit OTP' },
        { status: 400 }
      );
    }

    const authKey = process.env.MSG91_AUTH_KEY || '556598A3vJm4dIfd6a70d96bP1';
    const mobileNumber = `91${cleanedPhone}`;

    // Call MSG91 Verify OTP API
    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?mobile=${mobileNumber}&otp=${cleanedOtp}`,
      {
        method: 'GET',
        headers: {
          authkey: authKey,
        },
      }
    );

    const data = await response.json();
    console.log('[MSG91 Verify Response]:', data);

    if (
      data.type === 'success' ||
      data.message?.toLowerCase().includes('success') ||
      data.message?.toLowerCase().includes('already verified')
    ) {
      return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    }

    return NextResponse.json(
      { error: data.message || 'Incorrect or expired OTP code' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[MSG91 OTP Verify Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Server error while verifying OTP' },
      { status: 500 }
    );
  }
}
