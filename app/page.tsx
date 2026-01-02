import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col md:flex-row font-sans">
      
      {/* Left Panel: Dark Blue Side */}
      <div className="flex w-full flex-col justify-between bg-[#0f172a] p-8 md:w-1/2 md:p-12 lg:p-20">
        {/* Logo Section */}
        <div className="flex items-center gap-2 text-white">
           <span className="font-bold text-xl tracking-tight">
             <span className="text-blue-500">W</span> Worship Ops
           </span>
        </div>

        {/* Main Hero Text */}
        <div className="my-10 flex flex-col justify-center">
          <h1 className="text-6xl font-bold text-white tracking-tight mb-2">
            404 Error
          </h1>
          <h2 className="text-3xl font-medium text-gray-300 mb-6">
            Page Not Found.
          </h2>
          <p className="text-lg text-gray-400 max-w-md leading-relaxed">
            We are currently working on this site.
            <br />
            Please check back later.
          </p>
        </div>

        {/* Copyright Footer */}
        <div className="text-sm text-gray-600">
          &copy; 2026 Worship Ops
        </div>
      </div>

      {/* Right Panel: White Side */}
      <div className="flex w-full flex-col justify-center bg-white p-8 md:w-1/2 md:p-12 lg:p-20">
        <div className="max-w-md">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! Site Under Construction
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            The page you are looking for is not yet available. Our team is hard at work to bring it to life.
          </p>

          <button className="group flex items-center gap-2 rounded-lg bg-[#0f172a] px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-gray-800">
            Return to Home
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </div>

    </main>
  );
}