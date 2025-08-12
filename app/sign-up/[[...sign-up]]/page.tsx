import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Get Started
          </h1>
          <p className="text-gray-600">
            Create your account for Supabase AI Docs
          </p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
