import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SERVER_CONFIG } from '@/config/server-config';

interface EmailValidationRequest {
  email: string;
}


/**
 * POST /api/auth/validate-email
 * Check if an email is whitelisted by calling the light server
 * This is used during the OAuth sign-in flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EmailValidationRequest;
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { isValid: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Call the light server to validate the email
    const response = await fetch(`${SERVER_CONFIG.light.url}${SERVER_CONFIG.light.endpoints.validateEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });
    
    if (!response.ok) {
      console.error(`Light server validation failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { isValid: false, error: 'Failed to validate email' },
        { status: 500 }
      );
    }
    
    const data = await response.json() as { isValid?: boolean };
    
    // Log the validation result
    console.log(`Email validation request: ${email} - Valid: ${data.isValid ?? false}`);
    
    return NextResponse.json({ 
      isValid: data.isValid ?? false 
    });
    
  } catch (error) {
    console.error('Email validation error:', error);
    return NextResponse.json(
      { isValid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}