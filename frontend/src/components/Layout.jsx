import { Link } from "react-router-dom";
import WalletInfo from "./WalletInfo";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation and Wallet Info */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* App Title and Logo */}
            <div>
              <h1 className="text-xl font-bold">
                <Link to="/" className="text-purple-600 hover:text-purple-800">
                  🎵 Audiomint
                </Link>
              </h1>
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-4 text-gray-600">
              <Link to="/" className="hover:text-purple-600 px-3 py-2">
                🛒 Marketplace
              </Link>
              <Link to="/mint" className="hover:text-purple-600 px-3 py-2">
                🎤 Mint Songs
              </Link>
              <Link to="/collection" className="hover:text-purple-600 px-3 py-2">
                🎧 Your NFTs
              </Link>
            </nav>
            
            {/* Wallet Info Component */}
            <WalletInfo />
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex justify-center mt-3 space-x-4 text-sm">
            <Link to="/" className="hover:text-purple-600 px-2 py-1">
              🛒 Marketplace
            </Link>
            <Link to="/mint" className="hover:text-purple-600 px-2 py-1">
              🎤 Mint
            </Link>
            <Link to="/collection" className="hover:text-purple-600 px-2 py-1">
              🎧 Collection
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Audiomint - Music NFT Marketplace</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;