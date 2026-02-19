import React from 'react';

const Layout = ({ children, header, footer, ...props }) => {
    return (
        <div className="flex flex-col h-screen overflow-hidden relative bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100" {...props}>
            {/* Background Gradient Mesh - 2 Colors (Blue/Violet) on Soft Base */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-violet-400 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                {header}
                <main className="flex-1 overflow-auto p-2 md:p-4 flex flex-col xl:flex-row gap-4">
                    {children}
                </main>
                {footer}
            </div>
        </div>
    );
};

export default Layout;
