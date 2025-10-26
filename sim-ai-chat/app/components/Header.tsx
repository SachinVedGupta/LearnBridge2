export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Sim AI Chat</h1>
            <p className="text-sm text-gray-400">Powered by Sim AI</p>
          </div>
        </div>
      </div>
    </header>
  );
}

