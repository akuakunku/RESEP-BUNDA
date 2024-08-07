import React from "react";
import { Link } from "react-router-dom";

const VerifyEmail = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-wavy-purple text-center">
      <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
      <p className="mb-4">A verification link has been sent to your email. Please check your inbox and verify your email address.</p>
      <p className="mb-4">Once verified, you can <Link to="/login" className="text-blue-500">log in</Link> to your account.</p>
    </div>
  );
};

export default VerifyEmail;
